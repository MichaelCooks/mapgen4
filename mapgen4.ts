/*
 * From http://www.redblobgames.com/maps/mapgen4/
 * Copyright 2018 Red Blob Games <redblobgames@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *      http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import param from "./config.js";
import {makeMesh} from "./mesh.ts";
import Painting from "./painting.ts";
import Renderer from "./render.ts";
import type {Mesh} from "./types.d.ts";


// each parameter is [initial value, low, high]
const initialParams = {
    elevation: [
        ['seed', 187, 1, 1 << 30],
        ['island', 0.5, 0, 1],
        ['noisy_coastlines', 0.01, 0, 0.1],
        ['hill_height', 0.02, 0, 0.1],
        ['mountain_jagged', 0, 0, 1],
        ['mountain_sharpness', 9.8, 9.1, 12.5],
        ['mountain_folds', 0.05, 0.0, 0.5],
        ['ocean_depth', 1.40, 1, 3],
    ],
    biomes: [
        ['wind_angle_deg', 0, 0, 360],
        ['raininess', 0.9, 0, 2],
        ['rain_shadow', 0.5, 0.1, 2],
        ['evaporation', 0.5, 0, 1],
    ],
    rivers: [
        ['lg_min_flow', 2.7, -5, 5],
        ['lg_river_width', -2.4, -5, 5],
        ['flow', 0.2, 0, 1],
    ],
    render: [
        ['zoom', 100/480, 100/1000, 100/50],
        ['x', 500, 0, 1000],
        ['y', 500, 0, 1000],
        ['light_angle_deg', 80, 0, 360],
        ['slope', 2, 0, 5],
        ['flat', 2.5, 0, 5],
        ['ambient', 0.25, 0, 1],
        ['overhead', 30, 0, 60],
        ['tilt_deg', 0, 0, 90],
        ['rotate_deg', 0, -180, 180],
        ['mountain_height', 50, 0, 250],
        ['outline_depth', 1, 0, 2],
        ['outline_strength', 15, 0, 30],
        ['outline_threshold', 0, 0, 100],
        ['outline_coast', 0, 0, 1],
        ['outline_water', 13.0, 0, 20], // things start going wrong when this is high
        ['biome_colors', 1, 0, 1],
        ['spin_speed_deg_per_sec', 0, -60, 60], // 0 = off
        ['obj_export_plate_height', 10, 0, 100],
    ],
} as const;

type Phase = keyof typeof initialParams;

const sliderMap = new Map<string, HTMLInputElement>();

function clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

function main({mesh, t_peaks}: { mesh: Mesh; t_peaks: number[]; }) {
    let render = new Renderer(mesh);

    /* set initial parameters */
    for (let phase of ['elevation', 'biomes', 'rivers', 'render'] as Phase[]) {
        const container = document.createElement('div');
        const header = document.createElement('h3');
        header.appendChild(document.createTextNode(phase));
        container.appendChild(header);
        document.getElementById('sliders')!.appendChild(container);

        for (let [name, initialValue, min, max] of initialParams[phase]) {
            const step = name === 'seed' ? 1 : 0.001;
            param[phase][name] = initialValue;

            let span = document.createElement('span');
            span.appendChild(document.createTextNode(name));

            let slider = document.createElement('input');
            slider.setAttribute('type', name === 'seed' ? 'number' : 'range');
            slider.setAttribute('min', min.toString());
            slider.setAttribute('max', max.toString());
            slider.setAttribute('step', step.toString());

            slider.addEventListener('input', _event => {
                param[phase][name] = slider.valueAsNumber;
                requestAnimationFrame(() => {
                    if (phase === 'render') { redraw(); }
                    else { generate(); }
                });
            });

            /* improve slider behavior on iOS */
            function handleTouch(event: TouchEvent) {
                let rect = slider.getBoundingClientRect();
                let value = (event.changedTouches[0].clientX - rect.left) / rect.width;
                value = min + value * (max - min);
                value = Math.round(value / step) * step;
                if (value < min) { value = min; }
                if (value > max) { value = max; }
                slider.value = value.toString();
                slider.dispatchEvent(new Event('input'));
                event.preventDefault();
                event.stopPropagation();
            }

            slider.addEventListener('touchmove', handleTouch);
            slider.addEventListener('touchstart', handleTouch);

            let controls = document.createElement('div');
            controls.style.display = 'flex';
            controls.style.alignItems = 'center';
            controls.style.gap = '0.5em';

            slider.style.flex = '1 1 auto';
            controls.appendChild(slider);

            let label = document.createElement('label');
            label.setAttribute('id', `slider-${name}`);
            label.appendChild(span);
            label.appendChild(controls);

            container.appendChild(label);
            slider.value = initialValue.toString();

            sliderMap.set(`${phase}.${name}`, slider);
        }
    }

    function redraw() {
        render.updateView(param.render);
    }

    function wrapDegrees(angle: number): number {
        return ((angle + 180) % 360 + 360) % 360 - 180;
    }

    let lastSpinTime = performance.now();

    function spinLoop(now: number) {
        const dt = Math.min(0.05, (now - lastSpinTime) / 1000);
        lastSpinTime = now;

        const speed = param.render.spin_speed_deg_per_sec ?? 0;
        if (speed !== 0) {
            param.render.rotate_deg = wrapDegrees(
                param.render.rotate_deg + speed * dt
            );

            const slider = sliderMap.get('render.rotate_deg') as HTMLInputElement | undefined;
            if (slider) {
                slider.value = param.render.rotate_deg.toString();
            }

            redraw();
        }

        requestAnimationFrame(spinLoop);
    }

    /* Ask render module to copy WebGL into Canvas */
    function download() {
        render.screenshotCallback = () => {
            let a = document.createElement('a');
            render.screenshotCanvas.toBlob(blob => {
                if (!blob) return;
                a.href = URL.createObjectURL(blob);
                a.setAttribute('download', `mapgen4-${param.elevation.seed}.png`);
                a.click();
            });
        };
        render.updateView(param.render);
    }

    function downloadTextFile(filename: string, text: string, mime = 'text/plain') {
        const a = document.createElement('a');
        const blob = new Blob([text], {type: mime});
        a.href = URL.createObjectURL(blob);
        a.setAttribute('download', filename);
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    function downloadBlobFile(filename: string, blob: Blob) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.setAttribute('download', filename);
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    async function readFramebufferToPNGBlob(fb: { id: WebGLFramebuffer | null }): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const anyRender = render as any;
            const gl = anyRender.webgl.gl as WebGLRenderingContext | WebGL2RenderingContext;
            const canvas = render.screenshotCanvas;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error("Could not get 2D context"));
                return;
            }

            const width = canvas.width;
            const height = canvas.height;
            const imageData = ctx.createImageData(width, height);
            const bytesPerRow = width * 4;
            const buffer = new Uint8Array(bytesPerRow * height);

            gl.bindFramebuffer(gl.FRAMEBUFFER, fb.id);
            gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, buffer);

            for (let y = 0; y < height; y++) {
                const srcStart = y * bytesPerRow;
                const srcEnd = srcStart + bytesPerRow;
                const dstStart = (height - 1 - y) * bytesPerRow;
                imageData.data.set(buffer.subarray(srcStart, srcEnd), dstStart);
            }

            ctx.putImageData(imageData, 0, 0);

            canvas.toBlob(blob => {
                if (!blob) reject(new Error("Could not encode PNG"));
                else resolve(blob);
            }, 'image/png');
        });
    }

    async function bakeIslandTextureBlob(): Promise<Blob> {
        const anyRender = render as any;

        const bakeParam = {
            ...param.render,
            tilt_deg: 0,
            rotate_deg: 0,
            ambient: 1,
            slope: 0,
            flat: 0,
            outline_depth: 0,
            outline_strength: 0,
            outline_threshold: 0,
            outline_coast: 0,
        };

        anyRender.fbo_river.clear(0, 0, 0, 0);
        anyRender.fbo_land.clear(0, 0, 0, 1);
        anyRender.fbo_depth.clear(0, 0, 0, 1);
        anyRender.fbo_drape.clear(0, 0, 0, 0);

        if (render.numRiverTriangles > 0) {
            anyRender.drawRivers();
        }

        anyRender.drawLand(bakeParam.outline_water);

        // Bake in top-down UV space
        anyRender.projection.set(anyRender.topdown);
        anyRender.drawDrape(bakeParam);

        return await readFramebufferToPNGBlob(anyRender.fbo_drape);
    }

    async function downloadOBJ() {
        const xy = render.a_quad_xy;
        const em = render.a_quad_em;
        const elements = render.quad_elements;

        const mountainHeight = param.render.mountain_height;
        const baseplateHeight = param.render.obj_export_plate_height ?? 10;

        const seed = param.elevation.seed;
        const objFilename = `mapgen4-${seed}-solid.obj`;
        const mtlFilename = `mapgen4-${seed}-solid.mtl`;
        const pngFilename = `mapgen4-${seed}-three_d-texture.png`;

        const vertexCount = xy.length / 2;
        const zByVertex = new Float32Array(vertexCount);

        type Face = [number, number, number];
        const topFaces: Face[] = [];
        const used = new Uint8Array(vertexCount);

        // Build the top surface from the existing land mesh.
        for (let i = 0; i < render.quad_elements_length; i += 3) {
            const a = elements[i];
            const b = elements[i + 1];
            const c = elements[i + 2];

            if (a < 0 || b < 0 || c < 0) continue;
            if (a === b || b === c || c === a) continue;

            const za = Math.max(0, em[2 * a]) * mountainHeight;
            const zb = Math.max(0, em[2 * b]) * mountainHeight;
            const zc = Math.max(0, em[2 * c]) * mountainHeight;

            zByVertex[a] = za;
            zByVertex[b] = zb;
            zByVertex[c] = zc;

            // Skip triangles entirely underwater.
            if (za <= 0 && zb <= 0 && zc <= 0) continue;

            used[a] = 1;
            used[b] = 1;
            used[c] = 1;
            topFaces.push([a, b, c]);
        }

        if (topFaces.length === 0) {
            alert("No land mesh is ready yet. Generate a map first.");
            return;
        }

        let textureBlob: Blob;
        try {
            textureBlob = await bakeIslandTextureBlob();
        } catch (err) {
            console.error("Failed to bake island texture", err);
            alert("Could not bake island texture PNG.");
            return;
        }

        const lines: string[] = [];
        lines.push(`# mapgen4 solid OBJ + texture export`);
        lines.push(`mtllib ${mtlFilename}`);
        lines.push(`o island_${seed}`);

        const topObjIndex = new Int32Array(vertexCount);
        const bottomObjIndex = new Int32Array(vertexCount);
        const topUvIndex = new Int32Array(vertexCount);
        topObjIndex.fill(-1);
        bottomObjIndex.fill(-1);
        topUvIndex.fill(-1);

        let nextObjIndex = 1;
        let nextUvIndex = 1;

        function worldX(i: number) {
            return xy[2 * i] - 500;
        }

        function worldMapY(i: number) {
            return xy[2 * i + 1] - 500;
        }

        function u(i: number) {
            return xy[2 * i] / 1000;
        }

        function v(i: number) {
            return 1 - (xy[2 * i + 1] / 1000);
        }

        // Create top vertices
        for (let i = 0; i < vertexCount; i++) {
            if (!used[i]) continue;

            const x = worldX(i);
            const mapY = worldMapY(i);
            const z = zByVertex[i];

            // OBJ: Y is up
            lines.push(`v ${x.toFixed(6)} ${z.toFixed(6)} ${(-mapY).toFixed(6)}`);
            topObjIndex[i] = nextObjIndex++;
        }

        // Create bottom/baseplate vertices
        for (let i = 0; i < vertexCount; i++) {
            if (!used[i]) continue;

            const x = worldX(i);
            const mapY = worldMapY(i);

            lines.push(`v ${x.toFixed(6)} ${(-baseplateHeight).toFixed(6)} ${(-mapY).toFixed(6)}`);
            bottomObjIndex[i] = nextObjIndex++;
        }

        // UVs for top surface only
        for (let i = 0; i < vertexCount; i++) {
            if (!used[i]) continue;

            lines.push(`vt ${u(i).toFixed(6)} ${v(i).toFixed(6)}`);
            topUvIndex[i] = nextUvIndex++;
        }

        // Top faces with texture coordinates
        lines.push(`usemtl island_top`);
        for (const [a, b, c] of topFaces) {
            lines.push(
                `f ${topObjIndex[a]}/${topUvIndex[a]} ${topObjIndex[b]}/${topUvIndex[b]} ${topObjIndex[c]}/${topUvIndex[c]}`
            );
        }

        // Bottom faces, reversed winding, no UVs
        lines.push(`usemtl island_base`);
        for (const [a, b, c] of topFaces) {
            lines.push(`f ${bottomObjIndex[c]} ${bottomObjIndex[b]} ${bottomObjIndex[a]}`);
        }

        // Find boundary edges of the kept surface
        const edgeMap = new Map<string, { count: number; a: number; b: number }>();

        function addEdge(a: number, b: number) {
            const key = a < b ? `${a},${b}` : `${b},${a}`;
            const existing = edgeMap.get(key);
            if (existing) {
                existing.count++;
            } else {
                edgeMap.set(key, { count: 1, a, b }); // preserve top-face orientation
            }
        }

        for (const [a, b, c] of topFaces) {
            addEdge(a, b);
            addEdge(b, c);
            addEdge(c, a);
        }

        // Side walls down to the baseplate
        for (const edge of edgeMap.values()) {
            if (edge.count !== 1) continue;

            const a = edge.a;
            const b = edge.b;

            const ta = topObjIndex[a];
            const tb = topObjIndex[b];
            const ba = bottomObjIndex[a];
            const bb = bottomObjIndex[b];

            if (ta < 0 || tb < 0 || ba < 0 || bb < 0) continue;

            lines.push(`f ${ta} ${tb} ${bb}`);
            lines.push(`f ${ta} ${bb} ${ba}`);
        }

        const mtl = [
            `newmtl island_top`,
            `Ka 1.000 1.000 1.000`,
            `Kd 1.000 1.000 1.000`,
            `Ks 0.000 0.000 0.000`,
            `illum 1`,
            `map_Kd ${pngFilename}`,
            ``,
            `newmtl island_base`,
            `Ka 0.42 0.35 0.28`,
            `Kd 0.42 0.35 0.28`,
            `Ks 0.000 0.000 0.000`,
            `illum 1`,
        ].join('\n');

        downloadTextFile(objFilename, lines.join('\n'), 'text/plain');
        downloadTextFile(mtlFilename, mtl, 'text/plain');
        downloadBlobFile(pngFilename, textureBlob);

        redraw();
    }

    /* Download current live config as JSON */
    function downloadConfig() {
        const a = document.createElement('a');
        const blob = new Blob(
            [JSON.stringify(param, null, 2)],
            { type: 'application/json' }
        );

        a.href = URL.createObjectURL(blob);
        a.setAttribute('download', `mapgen4-config-${param.elevation.seed}.json`);
        a.click();

        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    function importConfig() {
        const input = document.getElementById('input-import-config') as HTMLInputElement | null;
        input?.click();
    }

    function applyImportedConfig(imported: any) {
        for (let phase of ['elevation', 'biomes', 'rivers', 'render'] as Phase[]) {
            if (!imported[phase] || typeof imported[phase] !== 'object') continue;

            for (let [name, _initialValue, min, max] of initialParams[phase]) {
                const value = imported[phase][name];
                if (typeof value !== 'number' || !Number.isFinite(value)) continue;

                const clamped = clamp(value, min, max);
                param[phase][name] = clamped;

                const slider = sliderMap.get(`${phase}.${name}`);
                if (slider) slider.value = clamped.toString();
            }
        }
    }

    async function handleImportConfig(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const imported = JSON.parse(text);

            applyImportedConfig(imported);
            Painting.setElevationParam(param.elevation);
            updateUI();

            requestAnimationFrame(() => {
                generate();
                redraw();
            });
        } catch (err) {
            console.error("Failed to import config", err);
            alert("Could not import config JSON.");
        } finally {
            input.value = "";
        }
    }

    /* Download painted terrain only */
    function downloadPaint() {
        const payload = {
            size: Painting.size,
            constraints: Array.from(Painting.constraints as ArrayLike<number>),
        };

        const a = document.createElement('a');
        const blob = new Blob(
            [JSON.stringify(payload, null, 2)],
            { type: 'application/json' }
        );

        a.href = URL.createObjectURL(blob);
        a.setAttribute('download', `mapgen4-paint-${param.elevation.seed}.json`);
        a.click();

        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    function importPaint() {
        const input = document.getElementById('input-import-paint') as HTMLInputElement | null;
        input?.click();
    }

    async function handleImportPaint(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const imported = JSON.parse(text);

            if (typeof imported !== 'object' || imported === null) {
                throw new Error("Invalid paint file");
            }

            let size = imported.size;
            let rawConstraints = imported.constraints;

            if (
                rawConstraints &&
                typeof rawConstraints === 'object' &&
                !Array.isArray(rawConstraints) &&
                'constraints' in rawConstraints
            ) {
                if (typeof rawConstraints.size === 'number' && Number.isFinite(rawConstraints.size)) {
                    size = rawConstraints.size;
                }
                rawConstraints = rawConstraints.constraints;
            }

            if (rawConstraints === undefined && imported.elevation !== undefined) {
                rawConstraints = imported.elevation;
            }

            let constraintArray: number[];

            if (Array.isArray(rawConstraints)) {
                constraintArray = rawConstraints;
            } else if (rawConstraints && typeof rawConstraints === 'object') {
                constraintArray = Object.keys(rawConstraints)
                    .map(k => Number(k))
                    .filter(k => Number.isInteger(k))
                    .sort((a, b) => a - b)
                    .map(k => rawConstraints[k]);
            } else {
                throw new Error("Paint file is missing constraints array");
            }

            if (typeof size === 'number' && Number.isFinite(size)) {
                Painting.size = size;
            }

            const target = Painting.constraints as Float32Array;
            target.fill(0);

            const n = Math.min(target.length, constraintArray.length);
            for (let i = 0; i < n; i++) {
                target[i] = Number(constraintArray[i]) || 0;
            }

            updateUI();
            requestAnimationFrame(() => {
                generate();
                redraw();
            });
        } catch (err) {
            console.error("Failed to import painted terrain", err);
            alert("Could not import painted terrain JSON.");
        } finally {
            input.value = "";
        }
    }

    Painting.screenToWorldCoords = (coords) => {
        let out = render.screenToWorld(coords);
        return [out[0] / 1000, out[1] / 1000];
    };

    Painting.onUpdate = () => {
        generate();
    };

    const worker = new window.Worker("build/_worker.js");
    let working = false;
    let workRequested = false;
    let elapsedTimeHistory: number[] = [];

    worker.addEventListener('messageerror', event => {
        console.log("WORKER ERROR", event);
    });

    worker.addEventListener('message', event => {
        working = false;
        let {elapsed, numRiverTriangles, quad_elements_buffer, a_quad_em_buffer, a_river_xyww_buffer} = event.data;
        elapsedTimeHistory.push(elapsed | 0);
        if (elapsedTimeHistory.length > 10) { elapsedTimeHistory.splice(0, 1); }

        const timingDiv = document.getElementById('timing');
        if (timingDiv) {
            timingDiv.innerText = `${elapsedTimeHistory.join(' ')} milliseconds`;
        }

        render.quad_elements = new Int32Array(quad_elements_buffer);
        render.a_quad_em = new Float32Array(a_quad_em_buffer);
        render.a_river_xyww = new Float32Array(a_river_xyww_buffer);
        render.numRiverTriangles = numRiverTriangles;
        render.updateMap();
        redraw();

        if (workRequested) {
            requestAnimationFrame(() => {
                workRequested = false;
                generate();
            });
        }
    });

    function updateUI() {
        let userHasPainted = Painting.userHasPainted();
        (document.querySelector("#slider-seed input") as HTMLInputElement).disabled = userHasPainted;
        (document.querySelector("#slider-island input") as HTMLInputElement).disabled = userHasPainted;
        (document.querySelector("#button-reset") as HTMLInputElement).disabled = !userHasPainted;
    }

    function generate() {
        if (!working) {
            working = true;
            Painting.setElevationParam(param.elevation);
            updateUI();

            worker.postMessage({
                param,
                constraints: {
                    size: Painting.size,
                    constraints: Painting.constraints,
                },
                quad_elements_buffer: render.quad_elements.buffer,
                a_quad_em_buffer: render.a_quad_em.buffer,
                a_river_xyww_buffer: render.a_river_xyww.buffer,
            }, [
                render.quad_elements.buffer,
                render.a_quad_em.buffer,
                render.a_river_xyww.buffer,
            ]);
        } else {
            workRequested = true;
        }
    }

    worker.postMessage({mesh, t_peaks, param});
    generate();

    const downloadButton = document.getElementById('button-download');
    if (downloadButton) downloadButton.addEventListener('click', download);

    const downloadConfigButton = document.getElementById('button-download-config');
    if (downloadConfigButton) downloadConfigButton.addEventListener('click', downloadConfig);

    const importConfigButton = document.getElementById('button-import-config');
    if (importConfigButton) importConfigButton.addEventListener('click', importConfig);

    const importConfigInput = document.getElementById('input-import-config') as HTMLInputElement | null;
    if (importConfigInput) importConfigInput.addEventListener('change', handleImportConfig);

    const downloadPaintButton = document.getElementById('button-download-paint');
    if (downloadPaintButton) downloadPaintButton.addEventListener('click', downloadPaint);

    const importPaintButton = document.getElementById('button-import-paint');
    if (importPaintButton) importPaintButton.addEventListener('click', importPaint);

    const importPaintInput = document.getElementById('input-import-paint') as HTMLInputElement | null;
    if (importPaintInput) importPaintInput.addEventListener('change', handleImportPaint);

    requestAnimationFrame(spinLoop);

    const downloadObjButton = document.getElementById('button-download-obj');
    if (downloadObjButton) downloadObjButton.addEventListener('click', downloadOBJ);
}

makeMesh().then(main);