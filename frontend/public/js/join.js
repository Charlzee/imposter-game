import { getURLParameter } from '../js/global.js';

const isLocal = getURLParameter('local') === 'true' ? true : false;

console.log(isLocal)