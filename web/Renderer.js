//basic variables needed
let zNear
let zFar

const debug = {
	axes: false,
	logErrors: false
}

let canvas
let ctx
let colorBuffer
let depthBuffer


//makes accessing vector components by offset easier to read
const _x = 0
const _y = 1
const _z = 2

const _r = 0
const _g = 1
const _b = 2

//lighting variables
let light = [-1000, -500, 16000]
let lightPower = 128
let shininess = 4

//vector utilities
const add = (a, b) => [a[_x] + b[_x], a[_y] + b[_y], a[_z] + b[_z]]
const cross = (a, b) =>
	[a[_y]*b[_z] - a[_z]*b[_y], a[_z]*b[_x] - a[_x]*b[_z], a[_x]*b[_y] - a[_y]*b[_x]]

const dot = (a, b) => a[_x]*b[_x] + a[_y]*b[_y] + a[_z]*b[_z]
const vlength = (a) => Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2))
const negate = ([a1, a2, a3=0]) => [-a1, -a2, -a3]
const normalize = (a) => {
	const l = vlength(a)
	return l && [a[_x] / l, a[_y] / l, (a[_z] || 0)  / l]
}
const scale = ([a1, a2, a3=0], s) => Float32Array.of(a1 * s, a2 * s, a3 * s)

export default class Renderer {

	constructor({width, height, nearClippingPlane, farClippingPlane}) {
		zNear = nearClippingPlane
		zFar = farClippingPlane
		this.width = width / 2
		this.height = height / 2
		
		//the transform is to make the center <0, 0> for proper perspective distortion
		canvas = new OffscreenCanvas(width|0, height|0)
		ctx = canvas.getContext('2d')
		ctx.setTransform(1, 0, 0, 1, width / 2, height / 2)
		
		//buffers
		depthBuffer = new Array(width*height)
		depthBuffer.fill(zFar)

		colorBuffer = new ImageData(width, height)
		colorBuffer.data.fill(0)
	}

	//getters and setters
	get zNear() {
		return zNear
	}
	get zFar() {
		return zFar
	}
	set debug(val) {
		if (val === true) {
			for (let key in debug) {
			if (debug.hasOwnProperty(key)) {
				debug[key] = true
			}
			}
		} else if (typeof val === "object") {
			for (let key in val) {
			if (debug.hasOwnProperty(key) && val.hasOwnProperty(key)) {
				debug[key] = val[key]
			}
			}
		}
	}
	get lightPower() {
		return lightPower
	}
	set lightPower(val) {
		lightPower = val
	}
	get light() {
		return light
	}
	set light(val) {
		if (val instanceof Array && val.length === 3) {
			light = val
		}
	}
	get shininess() {
		return shininess
	}
	set shininess(val) {
		shininess = val
	}

	//only necessary if you're not drawing to the entire screen
	clear() {
		colorBuffer.data.fill(0)
	}

	//clear the depth buffer or the scene gets all broken and trippy
	beginFrame() {
		depthBuffer.fill(zFar)
	}

	//save the current color buffer to the offscreen canvas
	endFrame() {
		ctx.putImageData(colorBuffer, 0, 0)
	}

	//the main event
	drawTris(inPoints) {
		for (let vindex = 0; vindex < inPoints.length - 17; vindex += 18) {
			//grab the vertex positions and vertex colors of the current triangle
			const v1 = inPoints.slice(vindex + _x,      vindex + _z +  1)
			const c1 = inPoints.slice(vindex + _x +  3, vindex + _z +  4)
			const v2 = inPoints.slice(vindex + _x +  6, vindex + _z +  7)
			const c2 = inPoints.slice(vindex + _x +  9, vindex + _z + 10)
			const v3 = inPoints.slice(vindex + _x + 12, vindex + _z + 13)
			const c3 = inPoints.slice(vindex + _x + 15, vindex + _z + 16)

			//project the vertices onto the near clipping plane with perspective distortion
			const xp1 = zNear * v1[_x] / v1[_z]
			const yp1 = zNear * v1[_y] / v1[_z]
			const xp2 = zNear * v2[_x] / v2[_z]
			const yp2 = zNear * v2[_y] / v2[_z]
			const xp3 = zNear * v3[_x] / v3[_z]
			const yp3 = zNear * v3[_y] / v3[_z]

			//figure out if the triangle even has any size
			const minX = Math.floor(Math.max(-this.width, Math.min(xp1, xp2, xp3)) + this.width)
			const minY = Math.floor(Math.max(-this.height, Math.min(yp1, yp2, yp3)) + this.height)
			const maxX = Math.ceil(Math.min(this.width, Math.max(xp1, xp2, xp3)) + this.width)
			const maxY = Math.ceil(Math.min(this.height, Math.max(yp1, yp2, yp3)) + this.height)
			if (minX != maxX && minY != maxY) {
				const vs1 = [xp2 - xp1, yp2 - yp1]
				const vs2 = [xp3 - xp1, yp3 - yp1]
				const cr = Math.min(vs1[_x]*vs2[_y] - vs1[_y]*vs2[_x], 0)
				//lighting calculations for each vertex, all in linear space
				const normal = normalize(cross(add(v2, negate(v1)), add(v3, negate(v1))))
				const vtxs = [v1, v2, v3]
				const diffuse = Math.sqrt(lightPower)
				const color = [0, 0, 0]
				for (let i = 0; i < 3; ++i) {
					const viewVec = negate(vtxs[i])
					const lvec = add(light, viewVec)
					const ldir = normalize(lvec)
					const lambertian = Math.max(dot(ldir, normal), 0)
					const halfdir = normalize(add(ldir, normalize(viewVec)))
					const speca = Math.max(dot(halfdir, normal) , 0)
					const spec = lambertian > 0 ? Math.pow(speca, shininess) : 0
					color[i] = (diffuse + (lambertian + spec) * lightPower) * zNear / (Math.pow(lvec[0], 2) + Math.pow(lvec[1], 2) + Math.pow(lvec[2], 2))
				}
				for (let i = minY; i < maxY; ++i) {
					let hit = false
					for (let j = minX; j < maxX; ++j) {
						//locations inside the depth and color buffers
						const o = i*this.width*2 + j
						const b = o*4
						const q0 = j - (xp1 + this.width)
						const q1 = i - (yp1 + this.height)
						const s = (q0*vs2[1] - q1*vs2[0])/cr
						//the if is broken up to return as early as possible to avoid excess calculation
						if (s >= 0) {
							const t = (vs1[0]*q1 - vs1[1]*q0)/cr
							if (t >= 0 && s + t <= 1) {
								hit = true
								const u = 1 - s - t
								//interpolate the z
								const z = u * v1[_z] + s * v2[_z] + t * v3[_z]
								//only render this pixel if it's in front of all previous pixels
								if (z < depthBuffer[o]) {
									depthBuffer[o] = z
									//color interpolation... also convert to sRGB *VERY ROUGHLY*
									colorBuffer.data[b    ] = Math.sqrt(color[0] * c1[_r] * u + color[1] * c2[_r] * s + color[2] * c3[_r] * t)*16
									colorBuffer.data[b + 1] = Math.sqrt(color[0] * c1[_g] * u + color[1] * c2[_g] * s + color[2] * c3[_g] * t)*16
									colorBuffer.data[b + 2] = Math.sqrt(color[0] * c1[_b] * u + color[1] * c2[_b] * s + color[2] * c3[_b] * t)*16
									colorBuffer.data[b + 3] = 255
								}
							} else if(hit) {
								//we can skip the rest of a scanline if we're done with the triange
								break
							}
						}
					}
				}
			} else if (debug.logErrors) {
				console.error(`Attempted to draw triangle with bounding box of width or height 0: (${maxX - minX}, ${maxY - minY})`)
			}
		}
	}
	get render() {
		if (debug.axes) {
			//not that we even need to save and restore since this is an offscreen canvas being returned
			//it doesn't modify a user's canvas in any way
			canvas.save()
			canvas.strokeStyle = '#0000ff'
			canvas.beginPath()
			canvas.moveTo(0, 0)
			canvas.lineTo(this.width / 2, 0)
			canvas.stroke()
			canvas.strokeStyle = '#00ff00'
			canvas.beginPath()
			canvas.moveTo(0, 0)
			canvas.lineTo(0, this.height / 2)
			canvas.stroke()
			canvas.restore()
		}
		return canvas
	}

}
