/*
 * From https://www.redblobgames.com/maps/mapgen4b/
 * Copyright 2023 Red Blob Games <redblobgames@gmail.com>
 * @license Apache-2.0 <https://www.apache.org/licenses/LICENSE-2.0.html>
 *
 * Generate boundary + poisson disc points and save them to disk.
 */

import * as fs from 'fs';
import param from "./config.js";
import {choosePoints} from "./generate-points.ts";
import {toPointsFile} from "./serialize-points.ts";

function main() {
    let p = choosePoints(
        param.mesh.seed, param.spacing, param.mountainSpacing);

    // original binary output (keep this for the app)
    fs.writeFileSync(`build/points-${param.spacing}.data`, toPointsFile(p));

    fs.writeFileSync(
        `build/config-${param.spacing}.json`,
        JSON.stringify(param, null, 2)
    );

    // export points as JSON too
    fs.writeFileSync(
        `build/points-${param.spacing}.json`,
        JSON.stringify(p, null, 2)
    );
}

main()
