'use strict';
import * as fs from 'fs';
import { readMovieAtom } from '../src/moov.mjs';

const movie = fs.readFileSync('./test/test.mov');

test('to read a movie atom', () => {
    const atom = readMovieAtom(new Uint8Array(movie.buffer));
    expect(atom.tracks.length).toBe(2);
});
