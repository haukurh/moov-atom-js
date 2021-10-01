'use strict';

import {
    readChars,
    findMarker,
    findMarkers,
    strToUint8Array,
    getUInt16,
    getUInt32,
    getFixedPoint16,
    getFixedPoint32,
} from '../src/binary.mjs';

test('readChars should read char codes from an UintA8Array', () => {
    const testString = 'test me much';
    const data = new Uint8Array([...testString].map(c => c.charCodeAt(0)));

    expect(readChars(data, 0, testString.length)).toBe(testString);
    expect(readChars(data, 0, 2)).toBe('te');
    expect(readChars(data, 2, 2)).toBe('st');
});

test('readChars unexpected input', () => {
    expect(() => readChars(new Uint16Array(10), 0, 2))
        .toThrowError(new TypeError('uint8Array must an instance of Uint8Array'));

    expect(() => readChars(new Uint8Array(10), '0', 2))
        .toThrowError(new TypeError('position must an integer'));

    expect(() => readChars(new Uint8Array(10), 0, '2'))
        .toThrowError(new TypeError('length must an integer'));
});

test('getUInt16 should retrieve correct position',  () => {
    const data = new Uint8Array([...Array(32).keys()]);
    // 00000000 00000001
    expect(getUInt16(data,  0)).toBe(1);
    // 00000001 00000010
    expect(getUInt16(data,  1)).toBe(258);
    // 00000010 00000011
    expect(getUInt16(data,  2)).toBe(515);
    // 00000011 00000100
    expect(getUInt16(data,  3)).toBe(772);
});

test('getUInt16 should throw when out of range',  () => {
    const data = new Uint8Array([...Array(32).keys()]);

    expect(() => getUInt16(data,  33))
        .toThrowError(new RangeError('Offset is outside the bounds of the DataView'));
});

test('getUInt16 should throw if invalid input',  () => {
    expect(() => getUInt16([],  0))
        .toThrowError(new TypeError('First argument to DataView constructor must be an ArrayBuffer'));

    expect(() => getUInt16(new Uint8Array(8),  '1'))
        .toThrowError(new TypeError('Byte offset must be an integer'));
});
