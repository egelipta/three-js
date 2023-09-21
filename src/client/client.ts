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

    const kerangkaSize = new THREE.BoxGeometry(600, 1900, 1200)
    const kerangka = new THREE.EdgesGeometry(kerangkaSize)
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x0531f7,
        linewidth: 2,
    })
    const kerangkaLine = new THREE.LineSegments(kerangka, lineMaterial)
    kerangkaLine.position.set(300, 720, -900)
    scene.add(kerangkaLine)

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const cubes = []
    const jarakY = 90 // Jarak antara kubus-kubus pada sumbu Y
    let isCubeRed = false // Menyimpan status warna kubus

    for (let i = 0; i < 21; i++) {
        const geometry1 = new THREE.BoxGeometry(482, 88.3, 562)
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
        const cube = new THREE.Mesh(geometry1, material)

        // Set posisi kubus
        cube.position.set(300, -180 + i * jarakY, -600)

        cube.userData.index = i // Tambahkan atribut indeks ke setiap kubus
        cubes.push(cube)
        scene.add(cube)
        // Membuat objek garis (outline) untuk kubus
        const edgesGeometry = new THREE.EdgesGeometry(cube.geometry)
        const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x000000 }) // Warna hitam
        const edgesLine = new THREE.LineSegments(edgesGeometry, edgesMaterial)
        edgesLine.position.copy(cube.position)
        scene.add(edgesLine)
    }

    const cubeColors = Array.from({ length: 21 }, () => 0x00ff00) // Awalnya semua kubus berwarna hijau

    // Tambahkan event listener untuk mendeteksi hover pada kubus
    document.addEventListener('mousemove', (event) => {
        // Mendapatkan posisi mouse dalam koordinat normalized device coordinates (NDC)
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

        // Lakukan raycasting untuk mendeteksi objek yang disorot oleh kursor
        raycaster.setFromCamera(mouse, camera)

        const intersects = raycaster.intersectObjects(cubes)

        if (intersects.length > 0) {
            const hoveredObject = intersects[0].object as THREE.Mesh // Explicit type casting
            const hoveredIndex = hoveredObject.userData.index

            // Tampilkan informasi "Index ke n used" di dalam elemen div dengan id "info"
            const infoDiv = document.getElementById('info')
            infoDiv.textContent = `Rack 1 ${hoveredIndex} used`

            // Di sini Anda dapat melakukan tindakan lain sesuai dengan objek yang disorot.
            // Misalnya, Anda dapat mengganti teks atau menampilkan informasi lain di elemen div ini.
        } else {
            // Jika tidak ada objek yang disorot, hapus teks dari elemen div
            const infoDiv = document.getElementById('info')
            infoDiv.textContent = ''
        }
    })

    //floor
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

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(ARC_SEGMENTS * 3), 3)
    )

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
