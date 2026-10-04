// Modelni (js/sim.js) brauzersiz, Node ichida yuklaydi.
const vm=require('vm'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const ctx=vm.createContext({console,TextEncoder,TextDecoder,Math});
vm.runInContext(fs.readFileSync(path.join(root,'js/sim.js'),'utf8'),ctx,{filename:'js/sim.js'});
module.exports=vm.runInContext(`({KINDS,FAULTS,TRUTH,CAUSE,plantDefaults,rngMake,runPlant2,feat2,trainModel2,computeIndex2,analyseRun,diagnose,sifTrip,voteLow,voteHigh,sisVote,parseCsvText,validateTankTable,sanitizeMnemo,sanitizeTags,findCols,zThreshold,trainModel2Gen})`,ctx);
module.exports.root=root;
