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

const getFixedPoint32 = (uint8Array, pos) => {
    const int = uint8Array.slice(pos, pos + 2);
    const point = uint8Array.slice(pos + 2, pos + 4);
    const first = (new DataView(int.buffer)).getUint16(0);
    const last = (new DataView(point.buffer)).getUint16(0);
    return parseFloat(`${first}.${last}`);
};

const getFixedPoint16 = (uint8Array, pos) => {
    const first = uint8Array[pos];
    const last = uint8Array[pos + 1];
    return parseFloat(`${first}.${last}`);
};

const getUInt16 = (uint8Array, byteOffset) => {
    if (!Number.isInteger(byteOffset)) {
        throw new TypeError('Byte offset must be an integer');
    }
    return (new DataView(uint8Array.buffer)).getUint16(byteOffset, false);
};

const getUInt32 = (uint8Array, pos) => {
    const buffer = uint8Array.slice(pos, pos + 4);
    return (new DataView(buffer.buffer)).getUint32(0);
};

export {
    readChars,
    findMarker,
    findMarkers,
    strToUint8Array,
    getUInt16,
    getUInt32,
    getFixedPoint16,
    getFixedPoint32,
};
