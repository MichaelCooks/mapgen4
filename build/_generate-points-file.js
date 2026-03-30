var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/fast-2d-poisson-disk-sampling/src/tiny-ndarray.js
var require_tiny_ndarray = __commonJS({
  "node_modules/fast-2d-poisson-disk-sampling/src/tiny-ndarray.js"(exports, module) {
    "use strict";
    function tinyNDArrayOfInteger(gridShape) {
      return {
        strideX: gridShape[1],
        data: new Uint32Array(gridShape[0] * gridShape[1])
      };
    }
    module.exports = tinyNDArrayOfInteger;
  }
});

// node_modules/fast-2d-poisson-disk-sampling/src/fast-poisson-disk-sampling.js
var require_fast_poisson_disk_sampling = __commonJS({
  "node_modules/fast-2d-poisson-disk-sampling/src/fast-poisson-disk-sampling.js"(exports, module) {
    "use strict";
    var tinyNDArray = require_tiny_ndarray();
    var piDiv3 = Math.PI / 3;
    var neighbourhood = [
      [0, 0],
      [0, -1],
      [-1, 0],
      [1, 0],
      [0, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
      [0, -2],
      [-2, 0],
      [2, 0],
      [0, 2],
      [-1, -2],
      [1, -2],
      [-2, -1],
      [2, -1],
      [-2, 1],
      [2, 1],
      [-1, 2],
      [1, 2]
    ];
    var neighbourhoodLength = neighbourhood.length;
    function FastPoissonDiskSampling(options, rng) {
      this.width = options.shape[0];
      this.height = options.shape[1];
      this.radius = options.radius || options.minDistance;
      this.maxTries = Math.max(3, Math.ceil(options.tries || 30));
      this.rng = rng || Math.random;
      const floatPrecisionMitigation = Math.max(1, Math.max(this.width, this.height) / 64 | 0);
      const epsilonRadius = 1e-14 * floatPrecisionMitigation;
      const epsilonAngle = 2e-14;
      this.squaredRadius = this.radius * this.radius;
      this.radiusPlusEpsilon = this.radius + epsilonRadius;
      this.cellSize = this.radius * Math.SQRT1_2;
      this.angleIncrement = Math.PI * 2 / this.maxTries;
      this.angleIncrementOnSuccess = piDiv3 + epsilonAngle;
      this.triesIncrementOnSuccess = Math.ceil(this.angleIncrementOnSuccess / this.angleIncrement);
      this.processList = [];
      this.samplePoints = [];
      this.gridShape = [
        Math.ceil(this.width / this.cellSize),
        Math.ceil(this.height / this.cellSize)
      ];
      this.grid = tinyNDArray(this.gridShape);
    }
    FastPoissonDiskSampling.prototype.width = null;
    FastPoissonDiskSampling.prototype.height = null;
    FastPoissonDiskSampling.prototype.radius = null;
    FastPoissonDiskSampling.prototype.radiusPlusEpsilon = null;
    FastPoissonDiskSampling.prototype.squaredRadius = null;
    FastPoissonDiskSampling.prototype.cellSize = null;
    FastPoissonDiskSampling.prototype.angleIncrement = null;
    FastPoissonDiskSampling.prototype.angleIncrementOnSuccess = null;
    FastPoissonDiskSampling.prototype.triesIncrementOnSuccess = null;
    FastPoissonDiskSampling.prototype.maxTries = null;
    FastPoissonDiskSampling.prototype.rng = null;
    FastPoissonDiskSampling.prototype.processList = null;
    FastPoissonDiskSampling.prototype.samplePoints = null;
    FastPoissonDiskSampling.prototype.gridShape = null;
    FastPoissonDiskSampling.prototype.grid = null;
    FastPoissonDiskSampling.prototype.addRandomPoint = function() {
      return this.directAddPoint([
        this.rng() * this.width,
        this.rng() * this.height,
        this.rng() * Math.PI * 2,
        0
      ]);
    };
    FastPoissonDiskSampling.prototype.addPoint = function(point) {
      var valid = point.length === 2 && point[0] >= 0 && point[0] < this.width && point[1] >= 0 && point[1] < this.height;
      return valid ? this.directAddPoint([
        point[0],
        point[1],
        this.rng() * Math.PI * 2,
        0
      ]) : null;
    };
    FastPoissonDiskSampling.prototype.directAddPoint = function(point) {
      var coordsOnly = [point[0], point[1]];
      this.processList.push(point);
      this.samplePoints.push(coordsOnly);
      var internalArrayIndex = (point[0] / this.cellSize | 0) * this.grid.strideX + (point[1] / this.cellSize | 0);
      this.grid.data[internalArrayIndex] = this.samplePoints.length;
      return coordsOnly;
    };
    FastPoissonDiskSampling.prototype.inNeighbourhood = function(point) {
      var strideX = this.grid.strideX, boundX = this.gridShape[0], boundY = this.gridShape[1], cellX = point[0] / this.cellSize | 0, cellY = point[1] / this.cellSize | 0, neighbourIndex, internalArrayIndex, currentDimensionX, currentDimensionY, existingPoint;
      for (neighbourIndex = 0; neighbourIndex < neighbourhoodLength; neighbourIndex++) {
        currentDimensionX = cellX + neighbourhood[neighbourIndex][0];
        currentDimensionY = cellY + neighbourhood[neighbourIndex][1];
        internalArrayIndex = currentDimensionX < 0 || currentDimensionY < 0 || currentDimensionX >= boundX || currentDimensionY >= boundY ? -1 : currentDimensionX * strideX + currentDimensionY;
        if (internalArrayIndex !== -1 && this.grid.data[internalArrayIndex] !== 0) {
          existingPoint = this.samplePoints[this.grid.data[internalArrayIndex] - 1];
          if (Math.pow(point[0] - existingPoint[0], 2) + Math.pow(point[1] - existingPoint[1], 2) < this.squaredRadius) {
            return true;
          }
        }
      }
      return false;
    };
    FastPoissonDiskSampling.prototype.next = function() {
      var tries, currentPoint, currentAngle, newPoint;
      while (this.processList.length > 0) {
        var index = this.processList.length * this.rng() | 0;
        currentPoint = this.processList[index];
        currentAngle = currentPoint[2];
        tries = currentPoint[3];
        if (tries === 0) {
          currentAngle = currentAngle + (this.rng() - 0.5) * piDiv3 * 4;
        }
        for (; tries < this.maxTries; tries++) {
          newPoint = [
            currentPoint[0] + Math.cos(currentAngle) * this.radiusPlusEpsilon,
            currentPoint[1] + Math.sin(currentAngle) * this.radiusPlusEpsilon,
            currentAngle,
            0
          ];
          if (newPoint[0] >= 0 && newPoint[0] < this.width && (newPoint[1] >= 0 && newPoint[1] < this.height) && !this.inNeighbourhood(newPoint)) {
            currentPoint[2] = currentAngle + this.angleIncrementOnSuccess + this.rng() * this.angleIncrement;
            currentPoint[3] = tries + this.triesIncrementOnSuccess;
            return this.directAddPoint(newPoint);
          }
          currentAngle = currentAngle + this.angleIncrement;
        }
        if (tries >= this.maxTries) {
          const r = this.processList.pop();
          if (index < this.processList.length) {
            this.processList[index] = r;
          }
        }
      }
      return null;
    };
    FastPoissonDiskSampling.prototype.fill = function() {
      if (this.samplePoints.length === 0) {
        this.addRandomPoint();
      }
      while (this.next()) {
      }
      return this.samplePoints;
    };
    FastPoissonDiskSampling.prototype.getAllPoints = function() {
      return this.samplePoints;
    };
    FastPoissonDiskSampling.prototype.reset = function() {
      var gridData = this.grid.data, i;
      for (i = 0; i < gridData.length; i++) {
        gridData[i] = 0;
      }
      this.samplePoints = [];
      this.processList.length = 0;
    };
    module.exports = FastPoissonDiskSampling;
  }
});

// node_modules/hash-int/hashint.js
var require_hashint = __commonJS({
  "node_modules/hash-int/hashint.js"(exports, module) {
    "use strict";
    var A;
    if (typeof Uint32Array === void 0) {
      A = [0];
    } else {
      A = new Uint32Array(1);
    }
    function hashInt(x) {
      A[0] = x | 0;
      A[0] -= A[0] << 6;
      A[0] ^= A[0] >>> 17;
      A[0] -= A[0] << 9;
      A[0] ^= A[0] << 4;
      A[0] -= A[0] << 3;
      A[0] ^= A[0] << 10;
      A[0] ^= A[0] >>> 15;
      return A[0];
    }
    module.exports = hashInt;
  }
});

// node_modules/@redblobgames/prng/index.js
var require_prng = __commonJS({
  "node_modules/@redblobgames/prng/index.js"(exports) {
    "use strict";
    var hashInt = require_hashint();
    exports.makeRandInt = function(seed) {
      let i = 0;
      return function(N) {
        i++;
        return hashInt(seed + i) % N;
      };
    };
    exports.makeRandFloat = function(seed) {
      let randInt = exports.makeRandInt(seed);
      let divisor = 268435456;
      return function() {
        return randInt(divisor) / divisor;
      };
    };
  }
});

// generate-points-file.ts
import * as fs from "fs";

// config.js
var config_default = {
  spacing: 5.5,
  mountainSpacing: 35,
  mesh: {
    seed: 12345
  },
  elevation: {},
  biomes: {},
  rivers: {},
  render: {}
};

// generate-points.ts
var import_fast_2d_poisson_disk_sampling = __toESM(require_fast_poisson_disk_sampling(), 1);
var import_prng = __toESM(require_prng(), 1);

// dual-mesh/create.ts
function generateInteriorBoundaryPoints({ left, top, width, height }, boundarySpacing) {
  const epsilon = 1e-4;
  const curvature = 1;
  let W = Math.ceil((width - 2 * curvature) / boundarySpacing);
  let H = Math.ceil((height - 2 * curvature) / boundarySpacing);
  let points = [];
  for (let q = 0; q < W; q++) {
    let t = q / W;
    let dx = (width - 2 * curvature) * t;
    let dy = epsilon + curvature * 4 * (t - 0.5) ** 2;
    points.push(
      [left + curvature + dx, top + dy],
      [left + width - curvature - dx, top + height - dy]
    );
  }
  for (let r = 0; r < H; r++) {
    let t = r / H;
    let dy = (height - 2 * curvature) * t;
    let dx = epsilon + curvature * 4 * (t - 0.5) ** 2;
    points.push(
      [left + dx, top + height - curvature - dy],
      [left + width - dx, top + curvature + dy]
    );
  }
  return points;
}
function generateExteriorBoundaryPoints({ left, top, width, height }, boundarySpacing) {
  const curvature = 1;
  const diagonal = boundarySpacing / Math.sqrt(2);
  let points = [];
  let W = Math.ceil((width - 2 * curvature) / boundarySpacing);
  let H = Math.ceil((height - 2 * curvature) / boundarySpacing);
  for (let q = 0; q < W; q++) {
    let t = q / W;
    let dx = (width - 2 * curvature) * t + boundarySpacing / 2;
    points.push(
      [left + dx, top - diagonal],
      [left + width - dx, top + height + diagonal]
    );
  }
  for (let r = 0; r < H; r++) {
    let t = r / H;
    let dy = (height - 2 * curvature) * t + boundarySpacing / 2;
    points.push(
      [left - diagonal, top + height - dy],
      [left + width + diagonal, top + dy]
    );
  }
  points.push(
    [left - diagonal, top - diagonal],
    [left + width + diagonal, top - diagonal],
    [left - diagonal, top + height + diagonal],
    [left + width + diagonal, top + height + diagonal]
  );
  return points;
}

// generate-points.ts
function choosePoints(seed, spacing, mountainSpacing) {
  const boundarySpacing = spacing * Math.sqrt(2);
  const bounds = { left: 0, top: 0, width: 1e3, height: 1e3 };
  let interiorBoundaryPoints = generateInteriorBoundaryPoints(bounds, boundarySpacing);
  let exteriorBoundaryPoints = generateExteriorBoundaryPoints(bounds, boundarySpacing);
  let mountainPointsGenerator = new import_fast_2d_poisson_disk_sampling.default({
    shape: [bounds.width, bounds.height],
    radius: mountainSpacing,
    tries: 30
  }, (0, import_prng.makeRandFloat)(seed));
  for (let p of interiorBoundaryPoints) {
    if (!mountainPointsGenerator.addPoint(p)) throw "mtn point did not get added";
  }
  let interiorPoints = mountainPointsGenerator.fill();
  let numMountainPoints = interiorPoints.length - interiorBoundaryPoints.length;
  let generator = new import_fast_2d_poisson_disk_sampling.default({
    shape: [bounds.width, bounds.height],
    radius: spacing,
    tries: 6
    // NOTE: below 5 is unstable, and 5 is borderline; defaults to 30, but lower is faster
  }, (0, import_prng.makeRandFloat)(seed));
  for (let p of interiorPoints) {
    if (!generator.addPoint(p)) throw "point did not get added";
  }
  interiorPoints = generator.fill();
  return {
    points: exteriorBoundaryPoints.concat(interiorPoints),
    numExteriorBoundaryPoints: exteriorBoundaryPoints.length,
    numInteriorBoundaryPoints: interiorBoundaryPoints.length,
    numMountainPoints
  };
}

// serialize-points.ts
var MAP_FLOAT_RANGE = [-100, 1e3 + 100];
var UINT_RANGE = [0, (1 << 16) - 1];
function rescale(value, before, after) {
  if (value < before[0] || value > before[1]) throw "rescaling out of range";
  return (value - before[0]) / (before[1] - before[0]) * (after[1] - after[0]) + after[0];
}
function toPointsFile(p) {
  let data = [
    p.numExteriorBoundaryPoints,
    p.numInteriorBoundaryPoints,
    p.numMountainPoints
  ];
  for (let [x, y] of p.points) {
    data.push(
      rescale(x, MAP_FLOAT_RANGE, UINT_RANGE),
      rescale(y, MAP_FLOAT_RANGE, UINT_RANGE)
    );
  }
  return Uint16Array.from(data);
}

// generate-points-file.ts
function main() {
  let p = choosePoints(
    config_default.mesh.seed,
    config_default.spacing,
    config_default.mountainSpacing
  );
  fs.writeFileSync(`build/points-${config_default.spacing}.data`, toPointsFile(p));
  fs.writeFileSync(
    `build/config-${config_default.spacing}.json`,
    JSON.stringify(config_default, null, 2)
  );
  fs.writeFileSync(
    `build/points-${config_default.spacing}.json`,
    JSON.stringify(p, null, 2)
  );
}
main();
/*
 * From https://www.redblobgames.com/maps/mapgen4/
 * Copyright 2023 Red Blob Games <redblobgames@gmail.com>
 * @license Apache-2.0 <https://www.apache.org/licenses/LICENSE-2.0.html>
 *
 * This module calculates
 *   * boundary points
 *   * mountain points
 *   * all other points
 */
/*
 * From https://www.redblobgames.com/maps/mapgen4b/
 * Copyright 2023 Red Blob Games <redblobgames@gmail.com>
 * @license Apache-2.0 <https://www.apache.org/licenses/LICENSE-2.0.html>
 *
 * Serialize/deserialize point data
 */
/*
 * From https://www.redblobgames.com/maps/mapgen4b/
 * Copyright 2023 Red Blob Games <redblobgames@gmail.com>
 * @license Apache-2.0 <https://www.apache.org/licenses/LICENSE-2.0.html>
 *
 * Generate boundary + poisson disc points and save them to disk.
 */
