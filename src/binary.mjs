'use strict';

const readChars = (uint8Array, position, length) => {
    if (!(uint8Array instanceof Uint8Array)) { throw new TypeError('uint8Array must an instance of Uint8Array'); }
    if (!Number.isInteger(position)) { throw new TypeError('position must an integer'); }
    if (!Number.isInteger(length)) { throw new TypeError('length must an integer'); }

    return [...uint8Array.slice(position, position + length)]
        .map((char) => String.fromCharCode(char))
        .join('')
        .replace("\u0000", '');
}

const findMarker = (haystack, needle) => {
    if (!(haystack instanceof Uint8Array)) { throw new TypeError('haystack must an instance of Uint8Array'); }

    const marker = strToUint8Array(needle);
    const match = marker.toString();
    for (let i = 0; i < haystack.length; i++) {
        if (haystack.slice(i, i + marker.length).toString() === match) {
            return i;
        }
    }
    return null;
}

const findMarkers = (haystack, needle) => {
    if (!(haystack instanceof Uint8Array)) { throw new TypeError('haystack must an instance of Uint8Array'); }

    const marker = strToUint8Array(needle);
    const match = marker.toString();
    const markerPositions = [];
    for (let i = 0; i < haystack.length; i++) {
        if (haystack.slice(i, i + marker.length).toString() === match) {
            markerPositions.push(i);
        }
    }
    return markerPositions;
}

const strToUint8Array = (str) => {
    const chars = str.split('').map((letter) => letter.charCodeAt(0));
    return new Uint8Array(chars);
}

const getFixedPoint32 = (uint8Array, byteOffset) => {
    if (!Number.isInteger(byteOffset)) { throw new TypeError('Byte offset must be an integer'); }

    const first = (new DataView(uint8Array.buffer)).getUint16(byteOffset, false);
    const last = (new DataView(uint8Array.buffer)).getUint16(byteOffset + 2, false);
    return parseFloat(`${first}.${last}`);
};

const getFixedPoint16 = (uint8Array, byteOffset) => {
    if (!(uint8Array instanceof Uint8Array)) { throw new TypeError('uint8Array must an instance of Uint8Array'); }
    if (!Number.isInteger(byteOffset)) { throw new TypeError('Byte offset must be an integer'); }

    const first = uint8Array[byteOffset];
    const last = uint8Array[byteOffset + 1];
    return parseFloat(`${first}.${last}`);
};

const getInt16 = (uint8Array, byteOffset) => {
    if (!Number.isInteger(byteOffset)) { throw new TypeError('Byte offset must be an integer'); }

    return (new DataView(uint8Array.buffer))
        .getInt16(byteOffset, false);
};

const getUInt16 = (uint8Array, byteOffset) => {
    if (!Number.isInteger(byteOffset)) { throw new TypeError('Byte offset must be an integer'); }

    return (new DataView(uint8Array.buffer))
        .getUint16(byteOffset, false);
};

const getInt32 = (uint8Array, byteOffset) => {
    if (!Number.isInteger(byteOffset)) { throw new TypeError('Byte offset must be an integer'); }

    return (new DataView(uint8Array.buffer))
        .getInt32(byteOffset, false);
};

const getUInt32 = (uint8Array, byteOffset) => {
    if (!Number.isInteger(byteOffset)) { throw new TypeError('Byte offset must be an integer'); }

    return (new DataView(uint8Array.buffer))
        .getUint32(byteOffset, false);
};

export {
    readChars,
    findMarker,
    findMarkers,
    strToUint8Array,
    getInt16,
    getInt32,
    getUInt16,
    getUInt32,
    getFixedPoint16,
    getFixedPoint32,
};
