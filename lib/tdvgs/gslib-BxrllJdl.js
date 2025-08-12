import { s as startWorkers } from "./worker0.js";
let wasm;
function isLikeNone(x) {
  return x === void 0 || x === null;
}
function addToExternrefTable0(obj) {
  const idx = wasm.__externref_table_alloc();
  wasm.__wbindgen_export_1.set(idx, obj);
  return idx;
}
function handleError(f, args) {
  try {
    return f.apply(this, args);
  } catch (e) {
    const idx = addToExternrefTable0(e);
    wasm.__wbindgen_exn_store(idx);
  }
}
let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
  if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer !== wasm.memory.buffer) {
    cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
  }
  return cachedDataViewMemory0;
}
let WASM_VECTOR_LEN = 0;
function passArrayJsValueToWasm0(array, malloc) {
  const ptr = malloc(array.length * 4, 4) >>> 0;
  for (let i = 0; i < array.length; i++) {
    const add = addToExternrefTable0(array[i]);
    getDataViewMemory0().setUint32(ptr + 4 * i, add, true);
  }
  WASM_VECTOR_LEN = array.length;
  return ptr;
}
const cachedTextDecoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8", { ignoreBOM: true, fatal: true }) : { decode: () => {
  throw Error("TextDecoder not available");
} };
if (typeof TextDecoder !== "undefined") {
  cachedTextDecoder.decode();
}
let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
  if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.buffer !== wasm.memory.buffer) {
    cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}
function getStringFromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return cachedTextDecoder.decode(getUint8ArrayMemory0().slice(ptr, ptr + len));
}
const cachedTextEncoder = typeof TextEncoder !== "undefined" ? new TextEncoder("utf-8") : { encode: () => {
  throw Error("TextEncoder not available");
} };
const encodeString = function(arg, view) {
  const buf = cachedTextEncoder.encode(arg);
  view.set(buf);
  return {
    read: arg.length,
    written: buf.length
  };
};
function passStringToWasm0(arg, malloc, realloc) {
  if (realloc === void 0) {
    const buf = cachedTextEncoder.encode(arg);
    const ptr2 = malloc(buf.length, 1) >>> 0;
    getUint8ArrayMemory0().subarray(ptr2, ptr2 + buf.length).set(buf);
    WASM_VECTOR_LEN = buf.length;
    return ptr2;
  }
  let len = arg.length;
  let ptr = malloc(len, 1) >>> 0;
  const mem = getUint8ArrayMemory0();
  let offset = 0;
  for (; offset < len; offset++) {
    const code = arg.charCodeAt(offset);
    if (code > 127) break;
    mem[ptr + offset] = code;
  }
  if (offset !== len) {
    if (offset !== 0) {
      arg = arg.slice(offset);
    }
    ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
    const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
    const ret = encodeString(arg, view);
    offset += ret.written;
    ptr = realloc(ptr, len, offset, 1) >>> 0;
  }
  WASM_VECTOR_LEN = offset;
  return ptr;
}
const CLOSURE_DTORS = typeof FinalizationRegistry === "undefined" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((state) => {
  wasm.__wbindgen_export_7.get(state.dtor)(state.a, state.b);
});
function makeMutClosure(arg0, arg1, dtor, f) {
  const state = { a: arg0, b: arg1, cnt: 1, dtor };
  const real = (...args) => {
    state.cnt++;
    const a = state.a;
    state.a = 0;
    try {
      return f(a, state.b, ...args);
    } finally {
      if (--state.cnt === 0) {
        wasm.__wbindgen_export_7.get(state.dtor)(a, state.b);
        CLOSURE_DTORS.unregister(state);
      } else {
        state.a = a;
      }
    }
  };
  real.original = state;
  CLOSURE_DTORS.register(real, state, state);
  return real;
}
function debugString(val) {
  const type = typeof val;
  if (type == "number" || type == "boolean" || val == null) {
    return `${val}`;
  }
  if (type == "string") {
    return `"${val}"`;
  }
  if (type == "symbol") {
    const description = val.description;
    if (description == null) {
      return "Symbol";
    } else {
      return `Symbol(${description})`;
    }
  }
  if (type == "function") {
    const name = val.name;
    if (typeof name == "string" && name.length > 0) {
      return `Function(${name})`;
    } else {
      return "Function";
    }
  }
  if (Array.isArray(val)) {
    const length = val.length;
    let debug = "[";
    if (length > 0) {
      debug += debugString(val[0]);
    }
    for (let i = 1; i < length; i++) {
      debug += ", " + debugString(val[i]);
    }
    debug += "]";
    return debug;
  }
  const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
  let className;
  if (builtInMatches && builtInMatches.length > 1) {
    className = builtInMatches[1];
  } else {
    return toString.call(val);
  }
  if (className == "Object") {
    try {
      return "Object(" + JSON.stringify(val) + ")";
    } catch (_) {
      return "Object";
    }
  }
  if (val instanceof Error) {
    return `${val.name}: ${val.message}
${val.stack}`;
  }
  return className;
}
function fetch_js(url, on_progress) {
  const ptr0 = passStringToWasm0(url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.fetch_js(ptr0, len0, on_progress);
  return ret;
}
function fetch_stream_js(url, on_progress) {
  const ptr0 = passStringToWasm0(url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.fetch_stream_js(ptr0, len0, on_progress);
  return ret;
}
let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
  if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.buffer !== wasm.memory.buffer) {
    cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
  }
  return cachedFloat32ArrayMemory0;
}
function getArrayF32FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}
function getArrayJsValueFromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  const mem = getDataViewMemory0();
  const result = [];
  for (let i = ptr; i < ptr + 4 * len; i += 4) {
    result.push(wasm.__wbindgen_export_1.get(mem.getUint32(i, true)));
  }
  wasm.__externref_drop_slice(ptr, len);
  return result;
}
function init_console_error() {
  wasm.init_console_error();
}
function get_bytes_per_position() {
  const ret = wasm.get_bytes_per_covariance();
  return ret;
}
function get_bytes_per_color() {
  const ret = wasm.get_bytes_per_color();
  return ret;
}
function get_bytes_per_covariance() {
  const ret = wasm.get_bytes_per_covariance();
  return ret;
}
function is_position_f16() {
  const ret = wasm.is_position_f16();
  return ret !== 0;
}
function load_url(url, on_progress, transform) {
  const ptr0 = passStringToWasm0(url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.load_url(ptr0, len0, on_progress, isLikeNone(transform) ? 0 : addToExternrefTable0(transform));
  return ret;
}
function _assertClass(instance, klass) {
  if (!(instance instanceof klass)) {
    throw new Error(`expected instance of ${klass.name}`);
  }
}
function passArray8ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 1, 1) >>> 0;
  getUint8ArrayMemory0().set(arg, ptr / 1);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}
let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
  if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.buffer !== wasm.memory.buffer) {
    cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
  }
  return cachedUint32ArrayMemory0;
}
function passArray32ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 4, 4) >>> 0;
  getUint32ArrayMemory0().set(arg, ptr / 4);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}
function getArrayU32FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}
function initThreadPool(num_threads) {
  const ret = wasm.initThreadPool(num_threads);
  return ret;
}
function wbg_rayon_start_worker(receiver) {
  wasm.wbg_rayon_start_worker(receiver);
}
function __wbg_adapter_32(arg0, arg1, arg2) {
  wasm.closure92_externref_shim(arg0, arg1, arg2);
}
function __wbg_adapter_35(arg0, arg1, arg2) {
  wasm.closure1014_externref_shim(arg0, arg1, arg2);
}
function __wbg_adapter_219(arg0, arg1, arg2, arg3) {
  wasm.closure1035_externref_shim(arg0, arg1, arg2, arg3);
}
const HitFinalization = typeof FinalizationRegistry === "undefined" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((ptr) => wasm.__wbg_hit_free(ptr >>> 0, 1));
class Hit {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(Hit.prototype);
    obj.__wbg_ptr = ptr;
    HitFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    HitFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_hit_free(ptr, 0);
  }
  /**
   * @returns {Point}
   */
  get point() {
    const ret = wasm.__wbg_get_hit_point(this.__wbg_ptr);
    return Point.__wrap(ret);
  }
  /**
   * @param {Point} arg0
   */
  set point(arg0) {
    _assertClass(arg0, Point);
    var ptr0 = arg0.__destroy_into_raw();
    wasm.__wbg_set_hit_point(this.__wbg_ptr, ptr0);
  }
  /**
   * @returns {number}
   */
  get distance() {
    const ret = wasm.__wbg_get_hit_distance(this.__wbg_ptr);
    return ret;
  }
  /**
   * @param {number} arg0
   */
  set distance(arg0) {
    wasm.__wbg_set_hit_distance(this.__wbg_ptr, arg0);
  }
  /**
   * @returns {number}
   */
  get index() {
    const ret = wasm.__wbg_get_hit_index(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * @param {number} arg0
   */
  set index(arg0) {
    wasm.__wbg_set_hit_index(this.__wbg_ptr, arg0);
  }
}
const PointFinalization = typeof FinalizationRegistry === "undefined" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((ptr) => wasm.__wbg_point_free(ptr >>> 0, 1));
class Point {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(Point.prototype);
    obj.__wbg_ptr = ptr;
    PointFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    PointFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_point_free(ptr, 0);
  }
  /**
   * @returns {number}
   */
  get x() {
    const ret = wasm.__wbg_get_point_x(this.__wbg_ptr);
    return ret;
  }
  /**
   * @param {number} arg0
   */
  set x(arg0) {
    wasm.__wbg_set_point_x(this.__wbg_ptr, arg0);
  }
  /**
   * @returns {number}
   */
  get y() {
    const ret = wasm.__wbg_get_point_y(this.__wbg_ptr);
    return ret;
  }
  /**
   * @param {number} arg0
   */
  set y(arg0) {
    wasm.__wbg_set_point_y(this.__wbg_ptr, arg0);
  }
  /**
   * @returns {number}
   */
  get z() {
    const ret = wasm.__wbg_get_point_z(this.__wbg_ptr);
    return ret;
  }
  /**
   * @param {number} arg0
   */
  set z(arg0) {
    wasm.__wbg_set_point_z(this.__wbg_ptr, arg0);
  }
}
const SortDataFinalization = typeof FinalizationRegistry === "undefined" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((ptr) => wasm.__wbg_sortdata_free(ptr >>> 0, 1));
class SortData {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    SortDataFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_sortdata_free(ptr, 0);
  }
  /**
   * @returns {number}
   */
  get splat_count() {
    const ret = wasm.__wbg_get_sortdata_splat_count(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * @param {number} arg0
   */
  set splat_count(arg0) {
    wasm.__wbg_set_sortdata_splat_count(this.__wbg_ptr, arg0);
  }
  /**
   * @returns {boolean}
   */
  get use_shared_memory() {
    const ret = wasm.__wbg_get_sortdata_use_shared_memory(this.__wbg_ptr);
    return ret !== 0;
  }
  /**
   * @param {boolean} arg0
   */
  set use_shared_memory(arg0) {
    wasm.__wbg_set_sortdata_use_shared_memory(this.__wbg_ptr, arg0);
  }
  /**
   * @returns {boolean}
   */
  get dynamic_mode() {
    const ret = wasm.__wbg_get_sortdata_dynamic_mode(this.__wbg_ptr);
    return ret !== 0;
  }
  /**
   * @param {boolean} arg0
   */
  set dynamic_mode(arg0) {
    wasm.__wbg_set_sortdata_dynamic_mode(this.__wbg_ptr, arg0);
  }
  /**
   * @param {number} splat_count
   * @param {boolean} dynamic_mode
   * @param {boolean} use_shared_memory
   * @param {number} max_scenes
   */
  constructor(splat_count, dynamic_mode, use_shared_memory, max_scenes) {
    const ret = wasm.sortdata_new(splat_count, dynamic_mode, use_shared_memory, max_scenes);
    this.__wbg_ptr = ret >>> 0;
    SortDataFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
  /**
   * @param {Uint8Array} positions_data
   * @param {number} offset
   * @param {boolean} halfPrecision
   */
  setPositions(positions_data, offset, halfPrecision) {
    const ptr0 = passArray8ToWasm0(positions_data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.sortdata_setPositions(this.__wbg_ptr, ptr0, len0, offset, halfPrecision);
  }
  /**
   * @param {THREE.Vector3} bound_min
   * @param {THREE.Vector3} bound_max
   */
  setBounds(bound_min, bound_max) {
    wasm.sortdata_setBounds(this.__wbg_ptr, bound_min, bound_max);
  }
  /**
   * @param {Uint32Array} transform_indices
   */
  setTransformIndices(transform_indices) {
    const ptr0 = passArray32ToWasm0(transform_indices, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.sortdata_setTransformIndices(this.__wbg_ptr, ptr0, len0);
  }
  /**
   * @param {(THREE.Matrix4)[]} transforms
   */
  setTransforms(transforms) {
    const ptr0 = passArrayJsValueToWasm0(transforms, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.sortdata_setTransforms(this.__wbg_ptr, ptr0, len0);
  }
  /**
   * @param {THREE.Matrix4} transform
   * @param {number} index
   */
  setTransform(transform, index) {
    wasm.sortdata_setTransform(this.__wbg_ptr, transform, index);
  }
  /**
   * @returns {Uint32Array}
   */
  getSortedIndices() {
    const ret = wasm.sortdata_getSortedIndices(this.__wbg_ptr);
    var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
  }
  /**
   * @returns {number}
   */
  getSortedIndicesPtr() {
    const ret = wasm.sortdata_getSortedIndicesPtr(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   *
   *     * Sorts the indices depending on the distance to the camera in descending order.
   *
   * @param {THREE.Vector3} camera_position
   * @param {THREE.Vector3} camera_direction
   * @returns {number}
   */
  sort(camera_position, camera_direction) {
    const ret = wasm.sortdata_sort(this.__wbg_ptr, camera_position, camera_direction);
    return ret >>> 0;
  }
}
const SplatBufferFinalization = typeof FinalizationRegistry === "undefined" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((ptr) => wasm.__wbg_splatbuffer_free(ptr >>> 0, 1));
class SplatBuffer {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(SplatBuffer.prototype);
    obj.__wbg_ptr = ptr;
    SplatBufferFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    SplatBufferFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_splatbuffer_free(ptr, 0);
  }
  /**
   * @param {THREE.Matrix4 | null} [transform]
   */
  setTransform(transform) {
    wasm.splatbuffer_setTransform(this.__wbg_ptr, isLikeNone(transform) ? 0 : addToExternrefTable0(transform));
  }
  /**
   * @returns {string}
   */
  getMetadata() {
    let deferred1_0;
    let deferred1_1;
    try {
      const ret = wasm.splatbuffer_getMetadata(this.__wbg_ptr);
      deferred1_0 = ret[0];
      deferred1_1 = ret[1];
      return getStringFromWasm0(ret[0], ret[1]);
    } finally {
      wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
  }
  /**
   * @returns {Float32Array | undefined}
   */
  getTransform() {
    const ret = wasm.splatbuffer_getTransform(this.__wbg_ptr);
    let v1;
    if (ret[0] !== 0) {
      v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
      wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    }
    return v1;
  }
  /**
   * @returns {number}
   */
  getGaussianCount() {
    const ret = wasm.splatbuffer_getGaussianCount(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * @returns {number}
   */
  getSHDegree() {
    const ret = wasm.splatbuffer_getSHDegree(this.__wbg_ptr);
    return ret;
  }
  /**
   * @returns {number}
   */
  getSHCBCount() {
    const ret = wasm.splatbuffer_getSHCBCount(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * @returns {Float32Array}
   */
  getSceneCenter() {
    const ret = wasm.splatbuffer_getSceneCenter(this.__wbg_ptr);
    var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
  }
  /**
   * @returns {Float32Array}
   */
  getCenterRadiusList() {
    const ret = wasm.splatbuffer_getCenterRadiusList(this.__wbg_ptr);
    var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
  }
  /**
   * @returns {number}
   */
  getCenterRadiusStep() {
    const ret = wasm.splatbuffer_getCenterRadiusStep(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * @returns {number}
   */
  getCurrentRadius() {
    const ret = wasm.splatbuffer_getCurrentRadius(this.__wbg_ptr);
    return ret;
  }
  /**
   * @returns {number}
   */
  getMaximumRadius() {
    const ret = wasm.splatbuffer_getMaximumRadius(this.__wbg_ptr);
    return ret;
  }
  /**
   * @returns {Float32Array}
   */
  getBoundsMin() {
    const ret = wasm.splatbuffer_getBoundsMin(this.__wbg_ptr);
    var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
  }
  /**
   * @returns {Float32Array}
   */
  getBoundsMax() {
    const ret = wasm.splatbuffer_getBoundsMax(this.__wbg_ptr);
    var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
  }
  /**
   * @returns {number}
   */
  getPositionsBufferPtr() {
    const ret = wasm.splatbuffer_getPositionsBufferPtr(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * @returns {number}
   */
  getCovariancesBufferPtr() {
    const ret = wasm.splatbuffer_getCovariancesBufferPtr(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * @returns {number}
   */
  getColorsBufferPtr() {
    const ret = wasm.splatbuffer_getColorsBufferPtr(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * @returns {number | undefined}
   */
  getShCoeffsBufferPtr() {
    const ret = wasm.splatbuffer_getShCoeffsBufferPtr(this.__wbg_ptr);
    return ret === 4294967297 ? void 0 : ret;
  }
  /**
   * @returns {number | undefined}
   */
  getShCoeffsIndicesBufferPtr() {
    const ret = wasm.splatbuffer_getShCoeffsIndicesBufferPtr(this.__wbg_ptr);
    return ret === 4294967297 ? void 0 : ret;
  }
  /**
   * @returns {number | undefined}
   */
  getShCoeffsCBBufferPtr() {
    const ret = wasm.splatbuffer_getShCoeffsCBBufferPtr(this.__wbg_ptr);
    return ret === 4294967297 ? void 0 : ret;
  }
  /**
   * @returns {number}
   */
  getLoadedPositionsCount() {
    const ret = wasm.splatbuffer_getLoadedPositionsCount(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * @returns {number}
   */
  getLoadedColorsCount() {
    const ret = wasm.splatbuffer_getLoadedColorsCount(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * @returns {number}
   */
  getLoadedShCoeffsCount() {
    const ret = wasm.splatbuffer_getLoadedShCoeffsCount(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * @returns {number}
   */
  getLoadedShCoeffsIndicesCount() {
    const ret = wasm.splatbuffer_getLoadedShCoeffsIndicesCount(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * @returns {number}
   */
  getLoadedShCoeffsCBCount() {
    const ret = wasm.splatbuffer_getLoadedShCoeffsCBCount(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * @returns {number}
   */
  getLoadedCovariancesCount() {
    const ret = wasm.splatbuffer_getLoadedCovariancesCount(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * @returns {number}
   */
  getDistanceLoadedFromSceneCenter() {
    const ret = wasm.splatbuffer_getDistanceLoadedFromSceneCenter(this.__wbg_ptr);
    return ret;
  }
  /**
   * @param {THREE.Matrix4} model_view
   * @param {number} cos_half_fov_x
   * @param {number} cos_half_fov_y
   * @returns {number}
   */
  computeVisibleIndices(model_view, cos_half_fov_x, cos_half_fov_y) {
    const ret = wasm.splatbuffer_computeVisibleIndices(this.__wbg_ptr, model_view, cos_half_fov_x, cos_half_fov_y);
    return ret >>> 0;
  }
  /**
   * @returns {number}
   */
  getVisibleIndicesBufferPtr() {
    const ret = wasm.splatbuffer_getVisibleIndicesBufferPtr(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * @param {THREE.Vector3} origin
   * @param {THREE.Vector3} direction
   * @param {boolean} precise
   * @param {boolean} first_hit_only
   * @returns {Hit[]}
   */
  raycast(origin, direction, precise, first_hit_only) {
    const ret = wasm.splatbuffer_raycast(this.__wbg_ptr, origin, direction, precise, first_hit_only);
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
  }
  /**
   * @returns {any}
   */
  getOctree() {
    const ret = wasm.splatbuffer_getOctree(this.__wbg_ptr);
    return ret;
  }
}
const wbg_rayon_PoolBuilderFinalization = typeof FinalizationRegistry === "undefined" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((ptr) => wasm.__wbg_wbg_rayon_poolbuilder_free(ptr >>> 0, 1));
class wbg_rayon_PoolBuilder {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(wbg_rayon_PoolBuilder.prototype);
    obj.__wbg_ptr = ptr;
    wbg_rayon_PoolBuilderFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    wbg_rayon_PoolBuilderFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_wbg_rayon_poolbuilder_free(ptr, 0);
  }
  /**
   * @returns {number}
   */
  numThreads() {
    const ret = wasm.wbg_rayon_poolbuilder_numThreads(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * @returns {number}
   */
  receiver() {
    const ret = wasm.wbg_rayon_poolbuilder_receiver(this.__wbg_ptr);
    return ret >>> 0;
  }
  build() {
    wasm.wbg_rayon_poolbuilder_build(this.__wbg_ptr);
  }
}
async function __wbg_load(module, imports) {
  if (typeof Response === "function" && module instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming === "function") {
      try {
        return await WebAssembly.instantiateStreaming(module, imports);
      } catch (e) {
        if (module.headers.get("Content-Type") != "application/wasm") {
          console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
        } else {
          throw e;
        }
      }
    }
    const bytes = await module.arrayBuffer();
    return await WebAssembly.instantiate(bytes, imports);
  } else {
    const instance = await WebAssembly.instantiate(module, imports);
    if (instance instanceof WebAssembly.Instance) {
      return { instance, module };
    } else {
      return instance;
    }
  }
}
function __wbg_get_imports() {
  const imports = {};
  imports.wbg = {};
  imports.wbg.__wbg_Window_925630dd9364b9e7 = function(arg0) {
    const ret = arg0.Window;
    return ret;
  };
  imports.wbg.__wbg_WorkerGlobalScope_f8a15b453de109c0 = function(arg0) {
    const ret = arg0.WorkerGlobalScope;
    return ret;
  };
  imports.wbg.__wbg_async_9ff6d9e405f13772 = function(arg0) {
    const ret = arg0.async;
    return ret;
  };
  imports.wbg.__wbg_body_0b8fd1fe671660df = function(arg0) {
    const ret = arg0.body;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
  };
  imports.wbg.__wbg_buffer_609cc3eee51ed158 = function(arg0) {
    const ret = arg0.buffer;
    return ret;
  };
  imports.wbg.__wbg_call_672a4d21634d4a24 = function() {
    return handleError(function(arg0, arg1) {
      const ret = arg0.call(arg1);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_call_7cccdd69e0791ae2 = function() {
    return handleError(function(arg0, arg1, arg2) {
      const ret = arg0.call(arg1, arg2);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_call_833bed5770ea2041 = function() {
    return handleError(function(arg0, arg1, arg2, arg3) {
      const ret = arg0.call(arg1, arg2, arg3);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_call_b8adc8b1d0a0d8eb = function() {
    return handleError(function(arg0, arg1, arg2, arg3, arg4) {
      const ret = arg0.call(arg1, arg2, arg3, arg4);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_data_432d9c3df2630942 = function(arg0) {
    const ret = arg0.data;
    return ret;
  };
  imports.wbg.__wbg_elements_a81bc7dfdce748ad = function(arg0, arg1) {
    const ret = arg1.elements;
    const ptr1 = passArrayJsValueToWasm0(ret, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
  };
  imports.wbg.__wbg_error_7534b8e9a36f1ab4 = function(arg0, arg1) {
    let deferred0_0;
    let deferred0_1;
    try {
      deferred0_0 = arg0;
      deferred0_1 = arg1;
      console.error(getStringFromWasm0(arg0, arg1));
    } finally {
      wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
    }
  };
  imports.wbg.__wbg_fetch_509096533071c657 = function(arg0, arg1) {
    const ret = arg0.fetch(arg1);
    return ret;
  };
  imports.wbg.__wbg_fetch_b7bf320f681242d2 = function(arg0, arg1) {
    const ret = arg0.fetch(arg1);
    return ret;
  };
  imports.wbg.__wbg_getRandomValues_80578b2ff2a093ba = function() {
    return handleError(function(arg0) {
      globalThis.crypto.getRandomValues(arg0);
    }, arguments);
  };
  imports.wbg.__wbg_getReader_be0d36e5873a525b = function(arg0) {
    const ret = arg0.getReader();
    return ret;
  };
  imports.wbg.__wbg_get_123509460060ab98 = function() {
    return handleError(function(arg0, arg1, arg2, arg3) {
      const ret = arg1.get(getStringFromWasm0(arg2, arg3));
      var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      var len1 = WASM_VECTOR_LEN;
      getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
      getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    }, arguments);
  };
  imports.wbg.__wbg_get_67b2ba62fc30de12 = function() {
    return handleError(function(arg0, arg1) {
      const ret = Reflect.get(arg0, arg1);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_headers_9cb51cfd2ac780a4 = function(arg0) {
    const ret = arg0.headers;
    return ret;
  };
  imports.wbg.__wbg_hit_new = function(arg0) {
    const ret = Hit.__wrap(arg0);
    return ret;
  };
  imports.wbg.__wbg_instanceof_File_a4e2256bf71955a9 = function(arg0) {
    let result;
    try {
      result = arg0 instanceof File;
    } catch (_) {
      result = false;
    }
    const ret = result;
    return ret;
  };
  imports.wbg.__wbg_instanceof_Object_7f2dcef8f78644a4 = function(arg0) {
    let result;
    try {
      result = arg0 instanceof Object;
    } catch (_) {
      result = false;
    }
    const ret = result;
    return ret;
  };
  imports.wbg.__wbg_instanceof_Response_f2cc20d9f7dfd644 = function(arg0) {
    let result;
    try {
      result = arg0 instanceof Response;
    } catch (_) {
      result = false;
    }
    const ret = result;
    return ret;
  };
  imports.wbg.__wbg_instanceof_Uint8Array_17156bcf118086a9 = function(arg0) {
    let result;
    try {
      result = arg0 instanceof Uint8Array;
    } catch (_) {
      result = false;
    }
    const ret = result;
    return ret;
  };
  imports.wbg.__wbg_instanceof_Window_def73ea0955fc569 = function(arg0) {
    let result;
    try {
      result = arg0 instanceof Window;
    } catch (_) {
      result = false;
    }
    const ret = result;
    return ret;
  };
  imports.wbg.__wbg_length_a446193dc22c12f8 = function(arg0) {
    const ret = arg0.length;
    return ret;
  };
  imports.wbg.__wbg_new_23a2665fac83c611 = function(arg0, arg1) {
    try {
      var state0 = { a: arg0, b: arg1 };
      var cb0 = (arg02, arg12) => {
        const a = state0.a;
        state0.a = 0;
        try {
          return __wbg_adapter_219(a, state0.b, arg02, arg12);
        } finally {
          state0.a = a;
        }
      };
      const ret = new Promise(cb0);
      return ret;
    } finally {
      state0.a = state0.b = 0;
    }
  };
  imports.wbg.__wbg_new_405e22f390576ce2 = function() {
    const ret = new Object();
    return ret;
  };
  imports.wbg.__wbg_new_46e8134c3341d05a = function() {
    return handleError(function() {
      const ret = new FileReader();
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_new_78feb108b6472713 = function() {
    const ret = new Array();
    return ret;
  };
  imports.wbg.__wbg_new_8a6f238a6ece86ea = function() {
    const ret = new Error();
    return ret;
  };
  imports.wbg.__wbg_new_9ffbe0a71eff35e3 = function() {
    return handleError(function(arg0, arg1) {
      const ret = new URL(getStringFromWasm0(arg0, arg1));
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_new_a12002a7f91c75be = function(arg0) {
    const ret = new Uint8Array(arg0);
    return ret;
  };
  imports.wbg.__wbg_new_b1a33e5095abf678 = function() {
    return handleError(function(arg0, arg1) {
      const ret = new Worker(getStringFromWasm0(arg0, arg1));
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_new_e25e5aab09ff45db = function() {
    return handleError(function() {
      const ret = new AbortController();
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_new_e9a4a67dbababe57 = function(arg0) {
    const ret = new Int32Array(arg0);
    return ret;
  };
  imports.wbg.__wbg_newnoargs_105ed471475aaf50 = function(arg0, arg1) {
    const ret = new Function(getStringFromWasm0(arg0, arg1));
    return ret;
  };
  imports.wbg.__wbg_newwithbyteoffsetandlength_d97e637ebe145a9a = function(arg0, arg1, arg2) {
    const ret = new Uint8Array(arg0, arg1 >>> 0, arg2 >>> 0);
    return ret;
  };
  imports.wbg.__wbg_newwithlength_a381634e90c276d4 = function(arg0) {
    const ret = new Uint8Array(arg0 >>> 0);
    return ret;
  };
  imports.wbg.__wbg_newwithstrandinit_06c535e0a867c635 = function() {
    return handleError(function(arg0, arg1, arg2) {
      const ret = new Request(getStringFromWasm0(arg0, arg1), arg2);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_of_4a05197bfc89556f = function(arg0, arg1, arg2) {
    const ret = Array.of(arg0, arg1, arg2);
    return ret;
  };
  imports.wbg.__wbg_pathname_9b0b04c4e19316d0 = function(arg0, arg1) {
    const ret = arg1.pathname;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
  };
  imports.wbg.__wbg_postMessage_6edafa8f7b9c2f52 = function() {
    return handleError(function(arg0, arg1) {
      arg0.postMessage(arg1);
    }, arguments);
  };
  imports.wbg.__wbg_queueMicrotask_97d92b4fcc8a61c5 = function(arg0) {
    queueMicrotask(arg0);
  };
  imports.wbg.__wbg_queueMicrotask_d3219def82552485 = function(arg0) {
    const ret = arg0.queueMicrotask;
    return ret;
  };
  imports.wbg.__wbg_readAsArrayBuffer_e51cb3c4fcc962de = function() {
    return handleError(function(arg0, arg1) {
      arg0.readAsArrayBuffer(arg1);
    }, arguments);
  };
  imports.wbg.__wbg_read_a2434af1186cb56c = function(arg0) {
    const ret = arg0.read();
    return ret;
  };
  imports.wbg.__wbg_resolve_4851785c9c5f573d = function(arg0) {
    const ret = Promise.resolve(arg0);
    return ret;
  };
  imports.wbg.__wbg_result_dadbdcc801180072 = function() {
    return handleError(function(arg0) {
      const ret = arg0.result;
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_set_37837023f3d740e8 = function(arg0, arg1, arg2) {
    arg0[arg1 >>> 0] = arg2;
  };
  imports.wbg.__wbg_set_3f1d0b984ed272ed = function(arg0, arg1, arg2) {
    arg0[arg1] = arg2;
  };
  imports.wbg.__wbg_set_65595bdd868b3009 = function(arg0, arg1, arg2) {
    arg0.set(arg1, arg2 >>> 0);
  };
  imports.wbg.__wbg_setonerror_578ff66d3363c119 = function(arg0, arg1) {
    arg0.onerror = arg1;
  };
  imports.wbg.__wbg_setonload_1302417ca59f658b = function(arg0, arg1) {
    arg0.onload = arg1;
  };
  imports.wbg.__wbg_setonmessage_5a885b16bdc6dca6 = function(arg0, arg1) {
    arg0.onmessage = arg1;
  };
  imports.wbg.__wbg_setsignal_75b21ef3a81de905 = function(arg0, arg1) {
    arg0.signal = arg1;
  };
  imports.wbg.__wbg_signal_aaf9ad74119f20a4 = function(arg0) {
    const ret = arg0.signal;
    return ret;
  };
  imports.wbg.__wbg_size_3808d41635a9c259 = function(arg0) {
    const ret = arg0.size;
    return ret;
  };
  imports.wbg.__wbg_slice_bd4c84b64bdfe01f = function() {
    return handleError(function(arg0, arg1, arg2) {
      const ret = arg0.slice(arg1, arg2);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_splatbuffer_new = function(arg0) {
    const ret = SplatBuffer.__wrap(arg0);
    return ret;
  };
  imports.wbg.__wbg_stack_0ed75d68575b0f3c = function(arg0, arg1) {
    const ret = arg1.stack;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
  };
  imports.wbg.__wbg_startWorkers_2ca11761e08ff5d5 = function(arg0, arg1, arg2) {
    const ret = startWorkers(arg0, arg1, wbg_rayon_PoolBuilder.__wrap(arg2));
    return ret;
  };
  imports.wbg.__wbg_static_accessor_GLOBAL_88a902d13a557d07 = function() {
    const ret = typeof global === "undefined" ? null : global;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
  };
  imports.wbg.__wbg_static_accessor_GLOBAL_THIS_56578be7e9f832b0 = function() {
    const ret = typeof globalThis === "undefined" ? null : globalThis;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
  };
  imports.wbg.__wbg_static_accessor_SELF_37c5d418e4bf5819 = function() {
    const ret = typeof self === "undefined" ? null : self;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
  };
  imports.wbg.__wbg_static_accessor_WINDOW_5de37043a91a9c40 = function() {
    const ret = typeof window === "undefined" ? null : window;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
  };
  imports.wbg.__wbg_status_f6360336ca686bf0 = function(arg0) {
    const ret = arg0.status;
    return ret;
  };
  imports.wbg.__wbg_subarray_aa9065fa9dc5df96 = function(arg0, arg1, arg2) {
    const ret = arg0.subarray(arg1 >>> 0, arg2 >>> 0);
    return ret;
  };
  imports.wbg.__wbg_then_44b73946d2fb3e7d = function(arg0, arg1) {
    const ret = arg0.then(arg1);
    return ret;
  };
  imports.wbg.__wbg_then_48b406749878a531 = function(arg0, arg1, arg2) {
    const ret = arg0.then(arg1, arg2);
    return ret;
  };
  imports.wbg.__wbg_value_dab73d3d5d4abaaf = function(arg0) {
    const ret = arg0.value;
    return ret;
  };
  imports.wbg.__wbg_waitAsync_61f0a081053dd3c2 = function(arg0, arg1, arg2) {
    const ret = Atomics.waitAsync(arg0, arg1 >>> 0, arg2);
    return ret;
  };
  imports.wbg.__wbg_waitAsync_7ce6c8a047c752c3 = function() {
    const ret = Atomics.waitAsync;
    return ret;
  };
  imports.wbg.__wbg_x_ee17d5da172d082f = function(arg0) {
    const ret = arg0.x;
    return ret;
  };
  imports.wbg.__wbg_y_74842f81d209bef6 = function(arg0) {
    const ret = arg0.y;
    return ret;
  };
  imports.wbg.__wbg_z_a3f29b8ed2d03d80 = function(arg0) {
    const ret = arg0.z;
    return ret;
  };
  imports.wbg.__wbindgen_boolean_get = function(arg0) {
    const v = arg0;
    const ret = typeof v === "boolean" ? v ? 1 : 0 : 2;
    return ret;
  };
  imports.wbg.__wbindgen_cb_drop = function(arg0) {
    const obj = arg0.original;
    if (obj.cnt-- == 1) {
      obj.a = 0;
      return true;
    }
    const ret = false;
    return ret;
  };
  imports.wbg.__wbindgen_closure_wrapper267 = function(arg0, arg1, arg2) {
    const ret = makeMutClosure(arg0, arg1, 93, __wbg_adapter_32);
    return ret;
  };
  imports.wbg.__wbindgen_closure_wrapper2904 = function(arg0, arg1, arg2) {
    const ret = makeMutClosure(arg0, arg1, 1015, __wbg_adapter_35);
    return ret;
  };
  imports.wbg.__wbindgen_closure_wrapper2905 = function(arg0, arg1, arg2) {
    const ret = makeMutClosure(arg0, arg1, 1015, __wbg_adapter_35);
    return ret;
  };
  imports.wbg.__wbindgen_debug_string = function(arg0, arg1) {
    const ret = debugString(arg1);
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
  };
  imports.wbg.__wbindgen_init_externref_table = function() {
    const table = wasm.__wbindgen_export_1;
    const offset = table.grow(4);
    table.set(0, void 0);
    table.set(offset + 0, void 0);
    table.set(offset + 1, null);
    table.set(offset + 2, true);
    table.set(offset + 3, false);
  };
  imports.wbg.__wbindgen_is_function = function(arg0) {
    const ret = typeof arg0 === "function";
    return ret;
  };
  imports.wbg.__wbindgen_is_undefined = function(arg0) {
    const ret = arg0 === void 0;
    return ret;
  };
  imports.wbg.__wbindgen_link_9579f016b4522a24 = function(arg0) {
    const val = `onmessage = function (ev) {
            let [ia, index, value] = ev.data;
            ia = new Int32Array(ia.buffer);
            let result = Atomics.wait(ia, index, value);
            postMessage(result);
        };
        `;
    const ret = typeof URL.createObjectURL === "undefined" ? "data:application/javascript," + encodeURIComponent(val) : URL.createObjectURL(new Blob([val], { type: "text/javascript" }));
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
  };
  imports.wbg.__wbindgen_memory = function() {
    const ret = wasm.memory;
    return ret;
  };
  imports.wbg.__wbindgen_module = function() {
    const ret = __wbg_init.__wbindgen_wasm_module;
    return ret;
  };
  imports.wbg.__wbindgen_number_get = function(arg0, arg1) {
    const obj = arg1;
    const ret = typeof obj === "number" ? obj : void 0;
    getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
  };
  imports.wbg.__wbindgen_number_new = function(arg0) {
    const ret = arg0;
    return ret;
  };
  imports.wbg.__wbindgen_rethrow = function(arg0) {
    throw arg0;
  };
  imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
    const ret = getStringFromWasm0(arg0, arg1);
    return ret;
  };
  imports.wbg.__wbindgen_throw = function(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
  };
  return imports;
}
function __wbg_init_memory(imports, memory) {
  imports.wbg.memory = memory || new WebAssembly.Memory({ initial: 23, maximum: 65536, shared: true });
}
function __wbg_finalize_init(instance, module, thread_stack_size) {
  wasm = instance.exports;
  __wbg_init.__wbindgen_wasm_module = module;
  cachedDataViewMemory0 = null;
  cachedFloat32ArrayMemory0 = null;
  cachedUint32ArrayMemory0 = null;
  cachedUint8ArrayMemory0 = null;
  if (typeof thread_stack_size !== "undefined" && (typeof thread_stack_size !== "number" || thread_stack_size === 0 || thread_stack_size % 65536 !== 0)) {
    throw "invalid stack size";
  }
  wasm.__wbindgen_start(thread_stack_size);
  return wasm;
}
function initSync(module, memory) {
  if (wasm !== void 0) return wasm;
  let thread_stack_size;
  if (typeof module !== "undefined") {
    if (Object.getPrototypeOf(module) === Object.prototype) {
      ({ module, memory, thread_stack_size } = module);
    } else {
      console.warn("using deprecated parameters for `initSync()`; pass a single object instead");
    }
  }
  const imports = __wbg_get_imports();
  __wbg_init_memory(imports, memory);
  if (!(module instanceof WebAssembly.Module)) {
    module = new WebAssembly.Module(module);
  }
  const instance = new WebAssembly.Instance(module, imports);
  return __wbg_finalize_init(instance, module, thread_stack_size);
}
async function __wbg_init(module_or_path, memory) {
  if (wasm !== void 0) return wasm;
  let thread_stack_size;
  if (typeof module_or_path !== "undefined") {
    if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
      ({ module_or_path, memory, thread_stack_size } = module_or_path);
    } else {
      console.warn("using deprecated parameters for the initialization function; pass a single object instead");
    }
  }
  if (typeof module_or_path === "undefined") {
    module_or_path = new URL("./gslib_bg.wasm", import.meta.url);
  }
  const imports = __wbg_get_imports();
  if (typeof module_or_path === "string" || typeof Request === "function" && module_or_path instanceof Request || typeof URL === "function" && module_or_path instanceof URL) {
    module_or_path = fetch(module_or_path);
  }
  __wbg_init_memory(imports, memory);
  const { instance, module } = await __wbg_load(await module_or_path, imports);
  return __wbg_finalize_init(instance, module, thread_stack_size);
}
export {
  Hit,
  Point,
  SortData,
  SplatBuffer,
  __wbg_init as default,
  fetch_js,
  fetch_stream_js,
  get_bytes_per_color,
  get_bytes_per_covariance,
  get_bytes_per_position,
  initSync,
  initThreadPool,
  init_console_error,
  is_position_f16,
  load_url,
  wbg_rayon_PoolBuilder,
  wbg_rayon_start_worker
};
