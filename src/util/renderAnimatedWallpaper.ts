import { telegramColorToVec3 } from "./colors";

let glCanvas: HTMLCanvasElement;

export function isWebGLSupported() {
    if (!glCanvas) {
        glCanvas = document.createElement('canvas');
    }

    return glCanvas.getContext('webgl') !== null;
}

export default function renderAnimatedWallpaper(canvas: HTMLCanvasElement,
    color1: number, color2: number, color3: number, color4: number, willAnimate:boolean = false) {
    if (!glCanvas) {
        glCanvas = document.createElement('canvas');
    }

    glCanvas.width = canvas.width;
    glCanvas.height = canvas.height;

    const gl = glCanvas.getContext('webgl')!

    if (!gl) {
      console.error('WebGL not supported');
      return null;
    }

    const program = gl.createProgram()
    if (!program) {      
        console.error(`Unable to create WebGLProgram`);
        return null;
    }

    const shaders = loadShaders(gl, [vertexShader, fragmentShader])
    for (const shader of shaders) {
        gl.attachShader(program, shader)
    }

    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        return null;
    }

    gl.useProgram(program)

    const positionAttributeLocation = gl.getAttribLocation(program, 'a_position')

    const positionBuffer = gl.createBuffer()

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)

    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
            -1,
            -1, 
            1,
            -1,
            -1,
            1,
            -1,
            1, 
            1,
            -1,
            1,
            1
        ]),
        gl.STATIC_DRAW
    )

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

    gl.useProgram(program)

    gl.enableVertexAttribArray(positionAttributeLocation)

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)

    gl.vertexAttribPointer(
        positionAttributeLocation,
        2,
        gl.FLOAT,
        false,
        0,
        0
    )

    const resolutionLoc = gl.getUniformLocation(program, 'resolution')
    const color1Loc = gl.getUniformLocation(program, 'color1')
    const color2Loc = gl.getUniformLocation(program, 'color2')
    const color3Loc = gl.getUniformLocation(program, 'color3')
    const color4Loc = gl.getUniformLocation(program, 'color4')
    const color1PosLoc = gl.getUniformLocation(program, 'color1Pos')
    const color2PosLoc = gl.getUniformLocation(program, 'color2Pos')
    const color3PosLoc = gl.getUniformLocation(program, 'color3Pos')
    const color4PosLoc = gl.getUniformLocation(program, 'color4Pos')

    const keyPoints = [
        [0.265, 0.582], 
        [0.176, 0.918], 
        [1 - 0.585, 1 - 0.164],
        [0.644, 0.755],
        [1 - 0.265, 1 - 0.582],
        [1 - 0.176, 1 - 0.918],
        [0.585, 0.164],
        [1 - 0.644, 1 - 0.755]
    ]
    let keyShift = 0
    let targetColor1Pos: number[]
    let targetColor2Pos: number[]
    let targetColor3Pos: number[]
    let targetColor4Pos: number[]

    updateTargetColors()

    function updateTargetColors() {
        targetColor1Pos = keyPoints[keyShift % 8]
        targetColor2Pos = keyPoints[(keyShift + 2) % 8]
        targetColor3Pos = keyPoints[(keyShift + 4) % 8]
        targetColor4Pos = keyPoints[(keyShift + 6) % 8]
        keyShift = (keyShift + 1) % 8
    }

    let color1Pos = [targetColor1Pos![0], targetColor1Pos![1]]
    let color2Pos = [targetColor2Pos![0], targetColor2Pos![1]]
    let color3Pos = [targetColor3Pos![0], targetColor3Pos![1]]
    let color4Pos = [targetColor4Pos![0], targetColor4Pos![1]]

    renderGradientCanvas()

    function renderGradientCanvas() {        
        gl.uniform2fv(resolutionLoc, [gl.canvas.width, gl.canvas.height])
        gl.uniform3fv(color1Loc, telegramColorToVec3(color1))
        gl.uniform3fv(color2Loc, telegramColorToVec3(color2))
        gl.uniform3fv(color3Loc, telegramColorToVec3(color3))
        gl.uniform3fv(color4Loc, telegramColorToVec3(color4))
        gl.uniform2fv(color1PosLoc, color1Pos)
        gl.uniform2fv(color2PosLoc, color2Pos)
        gl.uniform2fv(color3PosLoc, color3Pos)
        gl.uniform2fv(color4PosLoc, color4Pos)

        gl.drawArrays(
            gl.TRIANGLES,
            0,
            6
        )

        const ctx = canvas.getContext('2d');        
        ctx?.drawImage(glCanvas, 0, 0);
    }

    if(!willAnimate){
        return null;
    }

    const speed = 0.05
    let animating = false

    function animate() {              
        animating = true
        if (
            distance(color1Pos, targetColor1Pos) > 0.01 ||
            distance(color2Pos, targetColor2Pos) > 0.01 ||
            distance(color3Pos, targetColor3Pos) > 0.01 ||
            distance(color3Pos, targetColor3Pos) > 0.01
        ) {         
            color1Pos[0] = color1Pos[0] * (1 - speed) + targetColor1Pos[0] * speed
            color1Pos[1] = color1Pos[1] * (1 - speed) + targetColor1Pos[1] * speed
            color2Pos[0] = color2Pos[0] * (1 - speed) + targetColor2Pos[0] * speed
            color2Pos[1] = color2Pos[1] * (1 - speed) + targetColor2Pos[1] * speed
            color3Pos[0] = color3Pos[0] * (1 - speed) + targetColor3Pos[0] * speed
            color3Pos[1] = color3Pos[1] * (1 - speed) + targetColor3Pos[1] * speed
            color4Pos[0] = color4Pos[0] * (1 - speed) + targetColor4Pos[0] * speed
            color4Pos[1] = color4Pos[1] * (1 - speed) + targetColor4Pos[1] * speed
            renderGradientCanvas()
            requestAnimationFrame(animate)
        } else {            
            animating = false
        }
    }

    return () => {        
        glCanvas.width = canvas.width;
        glCanvas.height = canvas.height;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        gl.useProgram(program)

        updateTargetColors()
        if (!animating) {
            requestAnimationFrame(animate)
        }
    };
}

function distance(p1: number[], p2: number[]) {
    return Math.sqrt(
        (p1[1] - p2[1]) * (p1[1] - p2[1])
    )
}

function loadShaders(
    gl: WebGLRenderingContext,
    shaderSources: [vertexShader: string, fragmentShader: string]
): readonly [WebGLShader, WebGLShader] {
    const [vertexShader, fragmentShader] = shaderSources
    return [
        loadShader(gl, vertexShader, gl.VERTEX_SHADER),
        loadShader(gl, fragmentShader, gl.FRAGMENT_SHADER)
    ] as const
}

function loadShader(
    gl: WebGLRenderingContext,
    shaderSource: string,
    shaderType: number
): WebGLShader {
    const shader = gl.createShader(shaderType)!
    gl.shaderSource(shader, shaderSource)
    gl.compileShader(shader)
    gl.getShaderParameter(shader, gl.COMPILE_STATUS)
    return shader
}

const vertexShader =
    `attribute vec4 a_position;

    void main() {

        gl_Position = a_position;
    }`;

const fragmentShader =
    `precision highp float;

    uniform vec2 resolution;

    uniform vec3 color1;
    uniform vec3 color2;
    uniform vec3 color3;
    uniform vec3 color4;

    uniform vec2 color1Pos;
    uniform vec2 color2Pos;
    uniform vec2 color3Pos;
    uniform vec2 color4Pos;

    void main() {
    vec2 position = gl_FragCoord.xy / resolution.xy;
    position.y = 1.0 - position.y;

    float dp1 = distance(position, color1Pos);
    float dp2 = distance(position, color2Pos);
    float dp3 = distance(position, color3Pos);
    float dp4 = distance(position, color4Pos);
    float minD = min(dp1, min(dp2, min(dp3, dp4)));
    float p = 3.0;

    dp1 = pow(1.0 - (dp1 - minD), p);
    dp2 = pow(1.0 - (dp2 - minD), p);
    dp3 = pow(1.0 - (dp3 - minD), p);
    dp4 = pow(1.0 - (dp4 - minD), p);
    float dpt = abs(dp1 + dp2 + dp3 + dp4);

    gl_FragColor =
        (vec4(color1 / 255.0, 1.0) * dp1 / dpt) +
        (vec4(color2 / 255.0, 1.0) * dp2 / dpt) +
        (vec4(color3 / 255.0, 1.0) * dp3 / dpt) +
        (vec4(color4 / 255.0, 1.0) * dp4 / dpt);
    }`;