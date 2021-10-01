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

test('findMarker should find word/marker in a Uint8Array', () => {
    const randomData = 'aaaaaaa moov bbbbbb';
    const data = new Uint8Array([...randomData].map(c => c.charCodeAt(0)));
    expect(findMarker(data, 'moov')).toBe(8);
    expect(findMarker(data, 'aaaa')).toBe(0);
    expect(findMarker(data, 'nope')).toBe(null);
});

test('findMarker should return null if not found', () => {
    const randomData = 'aaaaaaa moov bbbbbb';
    const data = new Uint8Array([...randomData].map(c => c.charCodeAt(0)));
    expect(findMarker(data, 'nope')).toBe(null);
});

test('findMarker invalid input', () => {
    expect(() => findMarker([], 'moov'))
        .toThrowError(new TypeError('haystack must an instance of Uint8Array'));

    expect(() => findMarker(new Uint8Array(10), -1))
        .toThrowError(new TypeError('str.split is not a function'));
});

test('findMarkers should find word/marker positions in a Uint8Array', () => {
    const randomData = 'aaaaaaa moov bbbbbb moov cccccc';
    const data = new Uint8Array([...randomData].map(c => c.charCodeAt(0)));
    expect(findMarkers(data, 'moov')).toStrictEqual([8, 20]);
    expect(findMarkers(data, 'nope')).toStrictEqual([]);
});

test('findMarkers invalid input', () => {
    expect(() => findMarkers([], 'moov'))
        .toThrowError(new TypeError('haystack must an instance of Uint8Array'));

    expect(() => findMarkers(new Uint8Array(10), -1))
        .toThrowError(new TypeError('str.split is not a function'));
});

test('strToUint8Array should return an Uint8Array', () => {
    const testString = 'test me much';
    expect(strToUint8Array(testString)).toBeInstanceOf(Uint8Array);
    expect(strToUint8Array(testString)).toStrictEqual(new Uint8Array([...testString].map(c => c.charCodeAt(0))));
});

test('strToUint8Array invalid input', () => {
    expect(() => strToUint8Array(32))
        .toThrowError(new TypeError('str.split is not a function'));
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

test('getUInt32 should retrieve correct position',  () => {
    const data = new Uint8Array([...Array(32).keys()]);
    // 00000000 00000001 00000010 00000011
    expect(getUInt32(data,  0)).toBe(66051);
    // 00000001 00000010 00000011 00000100
    expect(getUInt32(data,  1)).toBe(16909060);
    // 00000010 00000011 00000100 00000101
    expect(getUInt32(data,  2)).toBe(33752069);
});


test('getUInt32 should throw when out of range',  () => {
    const data = new Uint8Array([...Array(32).keys()]);

    expect(() => getUInt32(data,  33))
        .toThrowError(new RangeError('Offset is outside the bounds of the DataView'));
});

test('getUInt32 should throw if invalid input',  () => {
    expect(() => getUInt32([],  0))
        .toThrowError(new TypeError('First argument to DataView constructor must be an ArrayBuffer'));

    expect(() => getUInt32(new Uint8Array(8),  '1'))
        .toThrowError(new TypeError('Byte offset must be an integer'));
});

test('getFixedPoint32 should parse correctly', () => {
    // 27.31
    //     0       27       0       31
    // 00000000 00011011 00000000 00011111
    const data = new Uint8Array([0, 27, 0, 31]);
    expect(getFixedPoint32(data, 0)).toBe(27.31);
});

test('getFixedPoint32 should throw if invalid input is given', () => {
    expect(() => getFixedPoint32([], 0))
        .toThrowError(new TypeError('First argument to DataView constructor must be an ArrayBuffer'));

    expect(() => getFixedPoint32(new Uint8Array(1), '0'))
        .toThrowError(new TypeError('Byte offset must be an integer'));
});

test('getFixedPoint16 should parse correctly', () => {
    // 27.31
    //    27       31
    // 00011011 00011111
    const data = new Uint8Array([27, 31]);
    expect(getFixedPoint16(data, 0)).toBe(27.31);
});

test('getFixedPoint16 should throw if invalid input is given', () => {
    expect(() => getFixedPoint16('', 0))
        .toThrowError(new TypeError('uint8Array must an instance of Uint8Array'));

    expect(() => getFixedPoint16(new Uint8Array(1), '0'))
        .toThrowError(new TypeError('Byte offset must be an integer'));
});
