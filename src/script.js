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
import portalVertexShader from './shaders/portal/vertex.glsl'
import portalFragmentShader from './shaders/portal/fragment.glsl'

// import videoTexture from '../static/js/video-texture.js'
///////////
// VIDEO //
///////////

// create the video element
let video = document.createElement( 'video' );
// video.id = 'video';
// video.type = ' video/ogg; codecs="theora, vorbis" ';
video.src = "video/teenage-conflict-1960-xs-comp.mp4";
video.load(); // must call after setting/changing source
video.loop = true
video.play();

// alternative method -- 
// create DIV in HTML:
// <video id="myVideo" autoplay style="display:none">
//		<source src="videos/sintel.ogv" type='video/ogg; codecs="theora, vorbis"'>
// </video>
// and set JS variable:
// video = document.getElementById( 'myVideo' );

let videoImage = document.createElement( 'canvas' );
videoImage.width = 675;
videoImage.height = 540;

let videoImageContext = videoImage.getContext( '2d' );
// background color if no video present
videoImageContext.fillStyle = '#000000';
videoImageContext.fillRect( 0, 0, videoImage.width, videoImage.height );

let videoTexture = new THREE.Texture( videoImage );
videoTexture.minFilter = THREE.LinearFilter;
videoTexture.magFilter = THREE.LinearFilter;

var movieMaterial = new THREE.MeshBasicMaterial( { map: videoTexture, overdraw: true, side:THREE.DoubleSide } );
// the geometry on which the movie will be displayed;
// 		movie image will be scaled to fit these dimensions.

// /**
//  * Spector JS
//  */
// const SPECTOR = require('spectorjs')
// const spector = new SPECTOR.Spector()
// spector.displayUI()

// Audio example
// https://github.com/mrdoob/three.js/blob/master/examples/webaudio_sandbox.html

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
let clock = null

let posSpotLightTL = null

// Debug
let gui = new dat.GUI({
  width: 400
})

dat.GUI.toggleHide()

// Canvas
const canvas = document.querySelector('canvas.webgl')
// Preloader and play buttons
const preloaderOverlay = document.querySelector('.loader-overlay')
const playButton = document.querySelector('.sound-button')
// preloaderOverlay.style.display = 'none'
// preloaderOverlay.style.opacity = 0

// Scene
const scene = new THREE.Scene()
// const color = 0x000000;
// const near = 10;
// const far = 100;
// scene.fog = new THREE.Fog(color, near, far);
// scene.fog = new THREE.FogExp2( 0x000000, 0.1 );

const sounds = [
  {name: 'NeonLight1', path: 'neon-hypnotizing-506434.mp3', volume: 0.4},
  {name: 'boxLightSmall', path: 'hum-also-known-as-sun.mp3', volume: 0.05}
]
let canPassSound = false

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
let portalLightMaterial = null
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

    this.debugObject = {}

    // To store all sounds
    this.allSounds = []

    // Add DOM events
    this.addDOMEvents()
    // this.masterInit()
  }

  masterInit() {
    this.makeShaderMaterial() // First lets make the shader material since dat gui needs it
    this.setupTweakGui() // Secondly lets setup tweak gui
    this.init()
    this.setupNecessaryAudio()
    this.loadModel()
    // this.addGodRays()
    this.initPostprocessing()
    this.tick()
  }

  init() {
    var self = this

    /**
     * Camera
     */
    // Base camera
    camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 1000)
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
    controls.minDistance = 5
    // controls.maxDistance = 50
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

    window.addEventListener('resize', this.onResize)  
  }

  setupNecessaryAudio() {
    var self = this
    // Create a listener
    this.listener = new THREE.AudioListener()
    camera.add( this.listener )
    // Create sound loader
    this.audioLoader = new THREE.AudioLoader()
  }

  loadSound(soundIndex, parent) {
    var self = this
    var sound = new THREE.PositionalAudio( self.listener );
    console.log('sound index: ', 'sound/' + sounds[ soundIndex ])
    // return
    this.audioLoader.load( 'sound/' + sounds[ soundIndex ].path, function ( buffer ) {
      sound.setBuffer( buffer )
      sound.setRefDistance( 20 )
      sound.setLoop( true )
      sound.setVolume( sounds[ soundIndex ].volume )
      sound.play() 
      parent.add( sound )
      // sounds.audio = sound
      // console.log('its working alright')
    })
    //
    // store sound and add to global array
    const analyser = new THREE.AudioAnalyser( sound, 32 );
    this.allSounds.push( {snd: sound, analyser: analyser} )
    // console.log()
  }
  
  loadModel() {
    var self = this
    /**
     * Model
     */
    gltfLoader.load(
      // 'portal.glb', // org. from Bruno Simon
      // 'landscape-playground.glb', // Mine from landscape-playground.blend
      // 'industrial-space-1b-as-in-better-spline-res.glb', // Mine from landscape-playground.blend
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
            // console.log(child)
            console.log(child.name)
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

            // Add the sounds
            let id = null
            if (child.name === 'NeonLight1') {
              id = 0
              canPassSound = true
            }
            if (child.name === 'lightBoxSmall') {              
              id = 1
              canPassSound = true
            }
            if (canPassSound) {
              self.loadSound(id, child)
              canPassSound = false
            }
          })

          const boxLightSmall = gltf.scene.children.find(child => child.name === 'boxLightSmall')
          const boxLightLarge = gltf.scene.children.find(child => child.name === 'boxLightLarge')
          const lightBoxLarge = gltf.scene.children.find(child => child.name === 'lightBoxLarge')
          const neonLightOne = gltf.scene.children.find(child => child.name === 'NeonLight1')
          // const spotLightTL = gltf.scene.children.find(child => child.name === 'SpotLightTL')

          boxLightSmall.material = boxLightSmallMaterial
          // boxLightLarge.material = boxLightLargeMaterial
          // boxLightLarge.material = portalLightMaterial
          // boxLightLarge.material = movieMaterial
          // console.log('boxLightLarge: ')
          // console.log(boxLightLarge)
          this.lightBoxLarge = lightBoxLarge
          neonLightOne.material = boxLightLargeMaterial

          // hide lightBoxLarge for testing
          // lightBoxLarge.visible = false
          boxLightLarge.visible = false

          scene.add(gltf.scene)

          this.setupOtherObjects()
      }
    )
  }

  setupOtherObjects() {
    const videoSize = {w: 4, h: 4}
    var movieGeometry = new THREE.PlaneGeometry( videoSize.w, videoSize.h, 4, 4 );
    var movieScreen = new THREE.Mesh( movieGeometry, movieMaterial );
    movieScreen.position.copy(this.lightBoxLarge.position)
    movieScreen.position.y += movieScreen.scale.y / 2
    movieScreen.position.x -= 0.2
    movieScreen.position.z -= 0.1
    // movieScreen.rotation.copy(this.lightBoxLarge.rotation * new THREE.Vector3(Math.PI / 2, Math.PI / 2, Math.PI / 2))
    movieScreen.rotation.y = 1.1
    // movieScreen.rotation.set(new THREE.Vector3( 0, Math.PI / 2, 0));
    movieScreen.scale.copy(this.lightBoxLarge.scale)
    movieScreen.scale.x /= 4
    movieScreen.scale.y /= 4
    scene.add(movieScreen);

  }

  setupTweakGui() {
    var self = this
    /**
     * Base
     */
    const parameters = {
      color: 0xff0000
    }
    // Pole light material
    const poleLightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffe5 })

    // Portal light material
    this.debugObject.portalColorStart = '#ff0000'
    this.debugObject.portalColorEnd = '#0000ff'

    gui
      .addColor(this.debugObject, 'portalColorStart')
      .onChange(() => {
        portalLightMaterial.uniforms.uColorStart.value.set(this.debugObject.portalColorStart)
      })

    gui
      .addColor(this.debugObject, 'portalColorEnd')
      .onChange(() => {
        portalLightMaterial.uniforms.uColorEnd.value.set(this.debugObject.portalColorEnd)
      })

    portalLightMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorStart: { value: new THREE.Color(this.debugObject.portalColorStart) },
        uColorEnd: { value: new THREE.Color(this.debugObject.portalColorEnd) }
      },
      vertexShader: portalVertexShader,
      fragmentShader: portalFragmentShader
    })

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

    // Update materials
    portalLightMaterial.uniforms.uTime.value = elapsedTime

    // Video material
    if ( video.readyState === video.HAVE_ENOUGH_DATA ) {
      videoImageContext.drawImage( video, 0, 0 );
      if ( videoTexture ) 
        videoTexture.needsUpdate = true;
    }
  
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

  addDOMEvents() {
    var self = this
    playButton.addEventListener('click', () => {
      console.log('play')
      this.listener.context.resume()
      preloaderOverlay.classList.add('loaded')
      // Add DOM events
      self.masterInit()
    })
    // preloaderOverlay.addEventListener('click', () => {
    //   console.log('play')
    //   this.listener.context.resume()
    //   preloaderOverlay.classList.add('loaded')
    // })
  }
}

const setup = new Setup()
