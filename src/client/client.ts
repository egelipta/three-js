import * as THREE from 'three'

import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls'

let container
let camera, scene, renderer
const splineHelperObjects = []
let splinePointsLength = 4
const positions = []
const point = new THREE.Vector3()

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const onUpPosition = new THREE.Vector2()
const onDownPosition = new THREE.Vector2()

const geometry = new THREE.BoxGeometry(0, 0, 0)
let transformControl

const ARC_SEGMENTS = 200

const splines = {}

const params = {
    uniform: true,
    tension: 0.5,
    centripetal: true,
    chordal: true,
    addPoint: addPoint,
    removePoint: removePoint,
}

let selectedCube = null

init()

function init() {
    container = document.getElementById('container')

    scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f0f0)

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 30000)
    camera.position.set(10, 500, 10000)
    scene.add(camera)

    scene.add(new THREE.AmbientLight(0xf0f0f0, 3))
    // const light = new THREE.SpotLight(0xffffff, 4.5)
    // light.position.set(0, 1500, 200)
    // light.angle = Math.PI * 0.2
    // light.decay = 0
    // light.castShadow = true
    // light.shadow.camera.near = 200
    // light.shadow.camera.far = 2000
    // light.shadow.bias = -0.000222
    // light.shadow.mapSize.width = 1024
    // light.shadow.mapSize.height = 1024
    // scene.add(light)

    // ========================RACK=======================
    const posLeftRightRack = 0
    const posTopBottomRack = 755
    const posFrontBackRack = -600
    const warnaRack = 0x000000 // hitam

    const geometryRack = new THREE.BoxGeometry(600, 1900, 1200)
    const materialRack = new THREE.MeshBasicMaterial({
        color: warnaRack,
        transparent: true,
        opacity: 0.8,
    })

    const pintu = new THREE.MeshBasicMaterial({
        color: 0x0a0a0a,
        transparent: true,
        opacity: 0,
    })
    const materialsRack = [
        materialRack, // Right
        materialRack, // Left
        materialRack, // Top
        materialRack, // Bottom
        pintu, // Front
        pintu, // Back
    ]
    const cubeRack = new THREE.Mesh(geometryRack, materialsRack)
    cubeRack.position.set(posLeftRightRack, posTopBottomRack, posFrontBackRack)
    scene.add(cubeRack)

    // garis tepi (outline) untuk rack
    const edgesRack = new THREE.EdgesGeometry(geometryRack)
    const outlineMaterialRack = new THREE.LineBasicMaterial({
        color: 0x000000, // Warna hitam
        linewidth: 1,
    })
    const outlineRack = new THREE.LineSegments(edgesRack, outlineMaterialRack)

    cubeRack.add(outlineRack)

    // ===================================================

    // ===================U/DEVICE========================
    const textureLoader = new THREE.TextureLoader()
    const warnaDevice = 0x424242 // Warna abu-abu
    const satuU = 44.2
    const panjangDevice = 562
    const lebarDevice = 482

    const mouse = new THREE.Vector2()
    const raycaster = new THREE.Raycaster()
    const cubes = []

    // Membuat array data dengan konfigurasi untuk 5 cubeDevice
    const data = [
        {
            id: 1,
            name: 'Blade Server',
            geometryDevice: new THREE.BoxGeometry(lebarDevice, satuU * 10, panjangDevice),
            posLeftRightDev: 0,
            posTopBottomDev: 40,
            posFrontBackDev: -300,
            texturePath: 'images/poweredge-m-family.jpg',
        },
        {
            id: 2,
            name: 'switch 10000',
            geometryDevice: new THREE.BoxGeometry(lebarDevice, satuU * 1, panjangDevice),
            posLeftRightDev: 0,
            posTopBottomDev: 1650,
            posFrontBackDev: -300,
            texturePath: 'images/c.jpg',
        },
        {
            id: 3,
            name: 'SSD SUN Storage',
            geometryDevice: new THREE.BoxGeometry(lebarDevice, satuU * 2, panjangDevice),
            posLeftRightDev: 0,
            posTopBottomDev: 320,
            posFrontBackDev: -300,
            texturePath: 'images/ssd-sun-DC.jpg',
        },
    ]

    data.forEach((config) => {
        const texture = textureLoader.load(config.texturePath)
        const materialFront = new THREE.MeshBasicMaterial({ map: texture })
        const materialOther = new THREE.MeshBasicMaterial({ color: warnaDevice })
        const materials = [
            materialOther, // kanan
            materialOther, // kiri
            materialOther, // atas
            materialOther, // bawah
            materialFront, // depan
            materialOther, // belakang
        ]
        const cubeDevice = new THREE.Mesh(config.geometryDevice, materials)

        cubeDevice.position.set(
            config.posLeftRightDev,
            config.posTopBottomDev,
            config.posFrontBackDev
        )
        cubes.push(cubeDevice)
        scene.add(cubeDevice)

        // outline device
        const edgesDevice = new THREE.EdgesGeometry(config.geometryDevice)
        const outlineMaterialDevice = new THREE.LineBasicMaterial({
            color: 0x000000, // Warna hitam
            linewidth: 1,
        })
        const outlineDevice = new THREE.LineSegments(edgesDevice, outlineMaterialDevice)

        cubeDevice.add(outlineDevice)
        cubeDevice.userData.id = config.id
    })

    // Event listener untuk mousemove
    document.addEventListener('mousemove', (event) => {
        // Mendapatkan posisi mouse dalam koordinat normalized device coordinates (NDC)
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

        // Lakukan raycasting untuk mendeteksi objek yang disorot oleh kursor
        raycaster.setFromCamera(mouse, camera)

        const intersects = raycaster.intersectObjects(cubes)

        if (intersects.length > 0) {
            const hoveredObject = intersects[0].object as THREE.Mesh
            const hoveredIndex = hoveredObject.userData.id // Menggunakan userData.id yang sudah didefinisikan sebelumnya
            let hoveredName = ''
            let hoveredT = ''

            // Cari objek dengan ID yang sesuai dalam array data
            const foundObject = data.find((item) => item.id === hoveredIndex)

            if (foundObject) {
                // Jika objek ditemukan, ambil properti
                hoveredName = foundObject.name
                hoveredT = foundObject.texturePath
            }

            const infoDiv = document.getElementById('info')
            infoDiv.innerHTML = `ID: ${hoveredIndex}<br>Name: ${hoveredName}<br>Path: ${hoveredT}`
        } else {
            const infoDiv = document.getElementById('info')
            infoDiv.textContent = ''
        }
    })

    // ===================================================

    //GRID
    const helper = new THREE.GridHelper(10000, 60)
    helper.position.y = -199
    helper.material.opacity = 0.25
    helper.material.transparent = true
    scene.add(helper)

    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.shadowMap.enabled = true
    container.appendChild(renderer.domElement)

    //GUI
    // const gui = new GUI()

    // gui.add(params, 'uniform').onChange(render)
    // // gui.add(params, 'tension', 0, 1)
    // //     .step(0.01)
    // //     .onChange(function (value) {
    // //         splines.uniform.tension = value
    // //         updateSplineOutline()
    // //         render()
    // //     })
    // gui.add(params, 'centripetal').onChange(render)
    // gui.add(params, 'chordal').onChange(render)
    // gui.add(params, 'addPoint')
    // gui.add(params, 'removePoint')
    // gui.add(params, 'exportSpline')
    // gui.open()

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    // controls.damping = 0.2
    controls.addEventListener('change', render)

    transformControl = new TransformControls(camera, renderer.domElement)
    transformControl.addEventListener('change', render)
    transformControl.addEventListener('dragging-changed', function (event) {
        controls.enabled = !event.value
    })
    scene.add(transformControl)

    transformControl.addEventListener('objectChange', function () {
        updateSplineOutline()
    })

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('pointerup', onPointerUp)
    document.addEventListener('pointermove', onPointerMove)
    window.addEventListener('resize', onWindowResize)

    /*******
     * Curves
     *********/

    for (let i = 0; i < splinePointsLength; i++) {
        addSplineObject(positions[i])
    }

    positions.length = 0

    for (let i = 0; i < splinePointsLength; i++) {
        positions.push(splineHelperObjects[i].position)
    }

    for (const k in splines) {
        const spline = splines[k]
        scene.add(spline.mesh)
    }

    load([
        new THREE.Vector3(289.76843686945404, 452.51481137238443, 56.10018915737797),
        new THREE.Vector3(-53.56300074753207, 171.49711742836848, -14.495472686253045),
        new THREE.Vector3(-91.40118730204415, 176.4306956436485, -6.958271935582161),
        new THREE.Vector3(-383.785318791128, 491.1365363371675, 47.869296953772746),
    ])

    render()
}

function addSplineObject(position) {
    const material = new THREE.MeshLambertMaterial({ color: Math.random() * 0xffffff })
    const object = new THREE.Mesh(geometry, material)

    if (position) {
        object.position.copy(position)
    } else {
        object.position.x = Math.random() * 1000 - 500
        object.position.y = Math.random() * 600
        object.position.z = Math.random() * 800 - 400
    }

    object.castShadow = true
    object.receiveShadow = true
    scene.add(object)
    splineHelperObjects.push(object)
    return object
}

function addPoint() {
    splinePointsLength++

    // positions.push(addSplineObject().position)

    updateSplineOutline()

    render()
}

function removePoint() {
    if (splinePointsLength <= 4) {
        return
    }

    const point = splineHelperObjects.pop()
    splinePointsLength--
    positions.pop()

    if (transformControl.object === point) transformControl.detach()
    scene.remove(point)

    updateSplineOutline()

    render()
}

function updateSplineOutline() {
    for (const k in splines) {
        const spline = splines[k]

        const splineMesh = spline.mesh
        const position = splineMesh.geometry.attributes.position

        for (let i = 0; i < ARC_SEGMENTS; i++) {
            const t = i / (ARC_SEGMENTS - 1)
            spline.getPoint(t, point)
            position.setXYZ(i, point.x, point.y, point.z)
        }

        position.needsUpdate = true
    }
}

function load(new_positions) {
    while (new_positions.length > positions.length) {
        addPoint()
    }

    while (new_positions.length < positions.length) {
        removePoint()
    }

    for (let i = 0; i < positions.length; i++) {
        positions[i].copy(new_positions[i])
    }

    updateSplineOutline()
}

function render() {
    // splines.uniform.mesh.visible = params.uniform
    // splines.centripetal.mesh.visible = params.centripetal
    // splines.chordal.mesh.visible = params.chordal
    renderer.render(scene, camera)
}

function onPointerDown(event) {
    onDownPosition.x = event.clientX
    onDownPosition.y = event.clientY
}

function onPointerUp(event) {
    onUpPosition.x = event.clientX
    onUpPosition.y = event.clientY

    if (onDownPosition.distanceTo(onUpPosition) === 0) {
        transformControl.detach()
        render()
    }
}

function onPointerMove(event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1

    raycaster.setFromCamera(pointer, camera)

    const intersects = raycaster.intersectObjects(splineHelperObjects, false)

    if (intersects.length > 0) {
        const object = intersects[0].object

        if (object !== transformControl.object) {
            transformControl.attach(object)
        }
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()

    renderer.setSize(window.innerWidth, window.innerHeight)

    render()
}
