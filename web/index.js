import Renderer from './Renderer.js';
const canvas = document.querySelector("canvas")
const ctx = canvas.getContext('2d')

const nearClippingPlane = 10000
const farClippingPlane = 18000

const r = new Renderer({width: canvas.width, height: canvas.height, nearClippingPlane, farClippingPlane})

r.debug = false


let frame = 0, lastTime, frameRate

let vtxs = []

let bgColor = [12, 200, 655]

//Set up all the DOM elements we need to interact with,
//because querySelector() is slow
const xrot = document.querySelector("#xrot")
const pitchFeedback = document.querySelector("#pitchFeedback")
const yrot = document.querySelector("#yrot")
const yawFeedback = document.querySelector("#yawFeedback")
const zrot = document.querySelector("#zrot")
const rollFeedback = document.querySelector("#rollFeedback")

const lpow = document.querySelector("#lpow")
const lpowFeedback = document.querySelector("#lpowFeedback")
const shine = document.querySelector("#shine")
const shineFeedback = document.querySelector("#shineFeedback")

const color = document.querySelector("#color")
const deform = document.querySelector("#deform")

//transformation functions
const R_x = (vtxs, theta) => {
	const c = Math.cos(theta)
	const s = Math.sin(theta)
	for (let i = 0; i < vtxs.length - 5; i += 6) {
		const y = vtxs[i + 1]
		const z = vtxs[i + 2]
		vtxs[i + 1] = c * y + s * z
		vtxs[i + 2] = c * z - s * y
	}
}

const R_y = (vtxs, theta) => {
	const c = Math.cos(theta)
	const s = Math.sin(theta)
	for (let i = 0; i < vtxs.length - 5; i += 6) {
		const x = vtxs[i]
		const z = vtxs[i + 2]
		vtxs[i] = c * x - s * z
		vtxs[i + 2] = c * z + s * x
	}
}

const R_z = (vtxs, theta) => {
	const c = Math.cos(theta)
	const s = Math.sin(theta)
	for (let i = 0; i < vtxs.length - 5; i += 6) {
		const x = vtxs[i]
		const y = vtxs[i + 1]
		vtxs[i] = c * x - s * y
		vtxs[i + 1] = c * y + s * x
	}
}

const T_z = (vtxs, dist) => {
	for (let i = 0; i < vtxs.length - 5; i += 6) {
		vtxs[i + 2] += dist
	}
}

const dim = (vtxs) => {
	for (let i = 0; i < vtxs.length - 5; i+= 6) {
		vtxs[i + 3] /= 6
		vtxs[i + 4] /= 6
		vtxs[i + 5] /= 6
	}
}

//this is used for the random oscillation deformation
const random = []

for (let z = -500; z < 600; z += 100) {
	random[z] = []
	for (let x = -500; x < 600; x += 100) {
		random[z][x] = Math.random() * 2 * Math.PI
	}
}
const bg = Array.of(-canvas.width, -canvas.height, 17500, ...bgColor, -canvas.width, canvas.height, 17500, ...bgColor, canvas.width, -canvas.height, 17500, ...bgColor,
	-canvas.width, canvas.height, 17500, ...bgColor, canvas.width, canvas.height, 17500, ...bgColor,canvas.width, -canvas.height, 17500, ...bgColor)

const draw = (timestamp = performance.now()) => {
	r.beginFrame()
	let tris = []
	for (let z = -500; z < 600; z += 100) {
		vtxs[z] = []
		for (let x = -500; x < 600; x+= 100) {
			//generate the y values for deformation
			if (deform.value == "sin") {
				vtxs[z][x] = (Math.sin((x + timestamp / 10) / 150) + Math.sin((z + timestamp / 10) / 150)) * 100
			} else if (deform.value == "random") {
				vtxs[z][x] = Math.sin(random[z][x] + timestamp / 2000) * 100
			} else if (deform.value == "none") {
				vtxs[z][x] = 0
			}
		}
	}
	for (let z = -500; z < 500; z += 100) {
		for (let x = -500; x < 500; x += 100) {
			const y1 = vtxs[z][x]
			const y2 = vtxs[z+100][x+100]
			const y3 = vtxs[z+100][x]
			const y4 = vtxs[z][x+100]
			const vcolors = []
			//generate the vertex colors
			if (color.value == "grass") {
				vcolors[0] = [350 - Math.min(y1 / 3, 0), 250-Math.min(y1*4, 0), 80 - Math.min(y1, 0)]
				vcolors[1] = [350 - Math.min(y2 / 3, 0), 250-Math.min(y2*4, 0), 80 - Math.min(y2, 0)]
				vcolors[2] = [350 - Math.min(y3 / 3, 0), 250-Math.min(y3*4, 0), 80 - Math.min(y3, 0)]
				vcolors[3] = [350 - Math.min(y4 / 3, 0), 250-Math.min(y4*4, 0), 80 - Math.min(y4, 0)]
			} else if (color.value == "rgb") {
				vcolors[0] = [255, 20, 20]
				vcolors[1] = [20, 255, 20]
				vcolors[2] = [20, 20, 255]
				vcolors[3] = [20, 20, 255]
			} else if (color.value == "gray") {
				vcolors[0] = [127, 127, 127]
				vcolors[1] = [127, 127, 127]
				vcolors[2] = [127, 127, 127]
				vcolors[3] = [127, 127, 127]
			}
			tris = tris.concat([x, y1, z,
				...(vcolors[0]),
				x + 100, y2, z + 100,
				...(vcolors[1]),
				x, y3, z + 100,
				...(vcolors[2]),
				x, y1, z,
				...(vcolors[0]),
				x + 100, y4, z,
				...(vcolors[3]),
				x + 100, y2, z + 100,
				...(vcolors[1])])
		}
	}

	//entire array transforms
	R_x(tris, xrot.value * Math.PI / 180)
	R_y(tris, yrot.value * Math.PI / 180)
	R_z(tris, zrot.value * Math.PI / 180)
	T_z(tris, 16700)
	dim(tris)

	//set light values and draw the renderer's color buffer
	r.lightPower = Math.pow(2, lpow.value)
	r.shininess = shine.value
	r.drawTris([...bg, ...tris])
	r.endFrame()
	ctx.drawImage(r.render, 0, 0)

	//draw a simple gradient for the light
	const lx = r.light[0] * nearClippingPlane / r.light[2] + canvas.width / 2
	const ly = r.light[1] * nearClippingPlane / r.light[2] + canvas.height / 2
	const lgrad = ctx.createRadialGradient(lx, ly, 1, lx, ly, r.lightPower)
	lgrad.addColorStop(0, "white")
	lgrad.addColorStop(0.125, "rgba(255, 255, 255, 0.5)")
	lgrad.addColorStop(0.25, "rgba(255, 255, 255, 0.25)")
	lgrad.addColorStop(0.5, "rgba(255, 255, 255, 0.125)")
	lgrad.addColorStop(1, "rgba(255, 255, 255, 0)")
	ctx.save()
	ctx.fillStyle = lgrad
	ctx.fillRect(lx - r.lightPower, ly - r.lightPower, r.lightPower * 2, r.lightPower * 2)
	ctx.restore()

	//calculate and draw the frameRate
	if (++frame % 100 == 0) {
		frameRate = (frameRate + frame * 1000/(performance.now() - lastTime))/2
		lastTime = performance.now()
		frame = 0
	}
	ctx.save()
	ctx.fillStyle = "black"
	ctx.rect(0, 0, 60, 20)
	ctx.fill()
	ctx.fillStyle = "white"
	ctx.font = "16px monospace"
	ctx.fillText(`${Math.round(frameRate)} FPS`, 2, 16, 56)
	ctx.restore()

	requestAnimationFrame(draw)
}

addEventListener('mousemove', (e) => {
	//calculations to project the mouse into the renderer's 3d space
	let mx = e.clientX - canvas.getBoundingClientRect().x - canvas.clientWidth / 2
	let my = e.clientY - canvas.getBoundingClientRect().y - canvas.clientHeight / 2
	r.light = [mx * r.light[2] / nearClippingPlane, my * r.light[2] / nearClippingPlane, r.light[2]]
})

//feedback from the controls in the DOM
const valDisplay = () => {
	pitchFeedback.innerHTML = `(${xrot.value}&deg;)`
	yawFeedback.innerHTML = `(${yrot.value}&deg;)`
	rollFeedback.innerHTML = `(${zrot.value}&deg;)`
	lpowFeedback.innerHTML = `(${lpow.value})`
	shineFeedback.innerHTML = `(${shine.value})`
}

xrot.addEventListener("input", valDisplay)
yrot.addEventListener("input", valDisplay)
zrot.addEventListener("input", valDisplay)
lpow.addEventListener("input", valDisplay)
shine.addEventListener("input", valDisplay)

valDisplay()

frameRate = 60
lastTime = performance.now()
requestAnimationFrame(draw)
