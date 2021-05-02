import './style.css'
import * as dat from 'dat.gui'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
// volumetric / godrays shaders
import godRaysShaders from '../static/js/godrays-shaders.js'

// /**
//  * Spector JS
//  */
// const SPECTOR = require('spectorjs')
// const spector = new SPECTOR.Spector()
// spector.displayUI()

/**
 * Sizes
 */
 const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

let camera = null
let renderer = null
let controls = null
let effectComposer = null
let renderTarget = null
let gui = null
let clock = null

let posSpotLightTL = null

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()
// const color = 0x000000;
// const near = 10;
// const far = 100;
// scene.fog = new THREE.Fog(color, near, far);
// scene.fog = new THREE.FogExp2( 0x000000, 0.1 );

/**
 * Loaders
 */
// Texture loader
const textureLoader = new THREE.TextureLoader()

// Draco loader
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('draco/')

// GLTF loader
const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

/**
 * Textures
 */
// const bakedTexture = textureLoader.load('baked.jpg') // org. from Bruno Simon
// const bakedTexture = textureLoader.load('bakedMine.jpg') // Mine from landscape-playground.blend
const bakedTexture = textureLoader.load('baked-industrial-space.jpg') // Mine from landscape-playground.blend
bakedTexture.flipY = false
bakedTexture.encoding = THREE.sRGBEncoding

/**
 * Materials
 */
// Baked material
const bakedMaterial = new THREE.MeshBasicMaterial({ map: bakedTexture })

// Portal light material
const portalLightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })
const boxLightSmallMaterial = new THREE.MeshBasicMaterial({ color: 0xffc0cb })
const boxLightLargeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })

// Pole light material
const poleLightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffe5 })

export default class Setup {
  constructor() {
    // Godrays shaders
    this.godRaysMaterial = ''
    this.coneMesh = ''
    this.spotLight = ''
    this.coneRadius = {
      value: 7
    }
    this.godrayVShader = godRaysShaders.godrayVShader
    this.godrayFShader = godRaysShaders.godrayFShader
    this.allSpots = []
    this.coneHeight = 22

    this.init()
    this.loadModel()
    this.makeShaderMaterial()
    // this.addGodRays()
    this.setupTweakGui()
    this.initPostprocessing()
    this.tick()
  }

  init() {
    var self = this

    /**
     * Camera
     */
    // Base camera
    camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100)
    camera.position.x = 4
    camera.position.y = 2
    camera.position.z = 4
    scene.add(camera)

    // Controls
    controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.enablePan = false
    // Set max polar angle
    controls.maxPolarAngle = (Math.PI * 0.5) * 0.99
    controls.minDistance = 10
    controls.maxDistance = 50
    /**
     * Renderer
     */
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true
    })
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputEncoding = THREE.sRGBEncoding

    // Make clock
    clock = new THREE.Clock()

    // Debug
    gui = new dat.GUI({
      width: 400
    })

    window.addEventListener('resize', this.onResize)  
  }

  loadModel() {
    var self = this
    /**
     * Model
     */
    gltfLoader.load(
      // 'portal.glb', // org. from Bruno Simon
      // 'landscape-playground.glb', // Mine from landscape-playground.blend
      'industrial-space-1.glb', // Mine from landscape-playground.blend
      (gltf) =>
      {
          // Bruno Simons 'portal.blend' model
          // const bakedMesh = gltf.scene.children.find(child => child.name === 'baked')
          // const portalLightMesh = gltf.scene.children.find(child => child.name === 'portalLight')
          // const poleLightAMesh = gltf.scene.children.find(child => child.name === 'poleLightA')
          // const poleLightBMesh = gltf.scene.children.find(child => child.name === 'poleLightB')
          
          // bakedMesh.material = bakedMaterial
          // portalLightMesh.material = portalLightMaterial
          // portalLightMesh.material = portalLightMaterial
          // poleLightAMesh.material = poleLightMaterial
          // poleLightBMesh.material = poleLightMaterial
          
          // My 'landscape-playground.blend' model
          // Traverse scene if wanting to look for things and names
          gltf.scene.traverse( child => {
            console.log(child)
            child.material = bakedMaterial
            // If there are walls hide them for now. Until single side material so cam can look through each of them
            if (
              child.name === 'Wall1' || child.name === 'Wall2' || 
              child.name === 'Wall3' || child.name === 'Wall4'
            ) {
              child.visible = false 
            }
            // If there is a spotlight then place the shader that fits it
            if (
              child.name === 'SpotLightTL' ||
              child.name === 'SpotLightTR' 
            ) {
              // Clone pos of spotLightTL
              posSpotLightTL = child.position.clone()
              // console.log(posSpotLightTL)
              setup.addGodRays(posSpotLightTL)
            }
          })

          const boxLightSmall = gltf.scene.children.find(child => child.name === 'boxLightSmall')
          const boxLightLarge = gltf.scene.children.find(child => child.name === 'boxLightLarge')
          const neonLightOne = gltf.scene.children.find(child => child.name === 'NeonLight1')
          // const spotLightTL = gltf.scene.children.find(child => child.name === 'SpotLightTL')

          boxLightSmall.material = boxLightSmallMaterial
          boxLightLarge.material = boxLightLargeMaterial
          neonLightOne.material = boxLightLargeMaterial

          scene.add(gltf.scene)
      }
    )
  }

  setupTweakGui() {
    var self = this
    /**
     * Base
     */
    const parameters = {
      color: 0xff0000
    }

    gui.add( self.coneRadius, 'value' ).min(1).max(10).step(0.1).name('Cone Radius')
    // gui.add( self.coneHeight, 'value').min(1).max(30).step(0.1).name('Cone height')
    gui.add( self.godRaysMaterial.uniforms['anglePower'], 'value').min(0.1).max(20).step(0.1).name('Angle Power')
    gui.add( self.godRaysMaterial.uniforms['attenuation'], 'value').min(0).max(30).step(0.1).name('Attenuation')
    gui.addColor(parameters, 'color')
      .onChange(() => {
        // material.color.set(parameters.color)
        self.allSpots[0].coneMesh.material.uniforms.lightColor.value = new THREE.Color(parameters.color)
      })
  }

  initPostprocessing() {
    var self = this
    // Post processing
    let RenderTargetClass = null

    if(renderer.getPixelRatio() === 1 && renderer.capabilities.isWebGL2) {
      RenderTargetClass = THREE.WebGLMultisampleRenderTarget
      console.log('Using WebGLMultisampleRenderTarget')
    }
    else {
      RenderTargetClass = THREE.WebGLRenderTarget
      console.log('Using WebGLRenderTarget')
    }

    renderTarget = new RenderTargetClass(
      800,
      600, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        encoding: THREE.sRGBEncoding
      }
    )

    // Effect composer
    effectComposer = new EffectComposer(renderer, renderTarget)
    effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    effectComposer.setSize(sizes.width, sizes.height)

    // Render pass
    const renderPass = new RenderPass(scene, camera)
    effectComposer.addPass(renderPass)
    // Antialias pass
    if(renderer.getPixelRatio() === 1 && !renderer.capabilities.isWebGL2)
    {
        const smaaPass = new SMAAPass()
        effectComposer.addPass(smaaPass)

        console.log('Using SMAA')
    }

    // Unreal Bloom pass
    const unrealBloomPass = new UnrealBloomPass()
    unrealBloomPass.enabled = false
    effectComposer.addPass(unrealBloomPass)

    unrealBloomPass.strength = 0.3
    unrealBloomPass.radius = 1
    unrealBloomPass.threshold = 0.6

    gui.add(unrealBloomPass, 'enabled')
    gui.add(unrealBloomPass, 'strength').min(0).max(2).step(0.001)
    gui.add(unrealBloomPass, 'radius').min(0).max(2).step(0.001)
    gui.add(unrealBloomPass, 'threshold').min(0).max(1).step(0.001)
  }

  makeShaderMaterial() {
    var self = this
    var volParams = {
      anglePower: 2.7,
      attenuation: 13,
    }
    self.godRaysMaterial = new THREE.ShaderMaterial({
      uniforms: { 
        attenuation: {
          type: 'f',
          value: volParams.attenuation
        },
        anglePower: {
          type: 'f',
          value: volParams.anglePower
        },
        spotPosition: {
          type: 'v3',
          value: new THREE.Vector3( 0, 0, 0 )
        },
        lightColor: {
          type: 'c',
          value: new THREE.Color('cyan')
        },
      },
      vertexShader: self.godrayVShader,
      fragmentShader: self.godrayFShader,
      // side		: THREE.DoubleSide,
      // blending	: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    })
  }

  addGodRays( colonePos ) {
    var self = this
    // add spot light
    console.log('should add god ray')
    // self.coneRadius = 7
    var lightAngle = self.coneRadius.value / 12
    var cone = new THREE.CylinderBufferGeometry( 0.1, self.coneRadius.value, self.coneHeight, 32 * 2, 20, true)
    // var cone = new THREE.BoxBufferGeometry( 100, 100, 100 )

    // cone.applyMatrix4( new THREE.Matrix4().makeTranslation( 0, -cone.parameters.height/2, 0 ) )
    // cone.applyMatrix4( new THREE.Matrix4().makeRotationX( -Math.PI / 2 ) )

    const coneMesh = new THREE.Mesh( cone, self.godRaysMaterial )
    // self.coneMesh.position.set( colonePos )
    coneMesh.position.set( colonePos.x, colonePos.y, colonePos.z )
    // coneMesh.position.set( 0, 5, 0 )

    coneMesh.lookAt( colonePos )
    self.godRaysMaterial.uniforms.lightColor.value.set('blue')
    self.godRaysMaterial.uniforms.spotPosition.value	= coneMesh.position
    coneMesh.renderOrder = 10
    scene.add( coneMesh )

    const spotLight = new THREE.SpotLight()
    spotLight.color = coneMesh.material.uniforms.lightColor.value
    spotLight.exponent = 30
    spotLight.angle = lightAngle
    spotLight.intensity = 0.2
  
    // Soften the edge of the light contact
    spotLight.penumbra = 0.52

    spotLight.position.copy(coneMesh.position)
    coneMesh.add( spotLight )
    
    self.allSpots.push( {coneMesh: coneMesh, spotLight: spotLight} )
  }

  tick() {
    const elapsedTime = clock.getElapsedTime()
  
    // Update controls
    controls.update()
  
    // Render
    // renderer.render(scene, camera)
    effectComposer.render()
  
    // Call tick again on the next frame
    window.requestAnimationFrame( () => {
      this.tick()
    } )
  }
  
  onResize() {
    var self = this
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }
}

const setup = new Setup()
