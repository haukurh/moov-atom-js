import { terser } from 'rollup-plugin-terser';

export default {
    input: 'src/moov.mjs',
    output: [{
        file: 'dist/moov-min.mjs',
        format: 'es',
        name: 'moovAtom',
        plugins: [terser()],
    },{
        file: 'dist/moov-min.js',
        format: 'iife',
        name: 'moovAtomJS',
        plugins: [terser()],
    }],
};
