const c=require('../src/core.js');
const base={whp:314.7,TVD:8000,MD:8200,id:2.992,Twh:110,Tbh:180,wc:0.3,gor:600,api:32,gg:0.75,gw:1.05,eps:0.0006,muL:3,N:40,glrInj:0,zInj:0,dpPump:0,zPump:0};
const Pr=3500,J=2; const Pb=c.standingPb(600,180,32,0.75); console.log('Pb',Pb, 'Bo',c.standingBo(600,180,32,0.75),'Z',c.zPapay(1500,150,0.75));
for(const q of [200,500,1000,1500,2000,2500,3000,4000]){const r=c.vlpPwf(q,base);console.log(q,r.pwf&&r.pwf.toFixed(0),'ipr',c.iprPwf(q,Pr,Pb,J).toFixed(0),'gasTop',r.gasFracTop&&r.gasFracTop.toFixed(2),'fric',r.dpFric&&r.dpFric.toFixed(0))}
console.log(c.nodalSolve(base,Pr,Pb,J));
console.log('gaslift',c.nodalSolve({...base,glrInj:400,zInj:6000},Pr,Pb,J));
console.log('esp',c.nodalSolve({...base,dpPump:800,zPump:7500},Pr,Pb,J));
console.log('J=0.8',c.nodalSolve(base,Pr,Pb,0.8));
// choke
for(const k of ['Gilbert','Ros','Baxendell','Achong'])console.log(k,c.chokeP(k,2000,600,24).toFixed(0),c.chokeS(k,2000,600,300).toFixed(1));
// sep
const s=c.sepSizing({Pg:150,T:110,Qg:2,Qo:2000,Qw:1000,gg:0.75,api:32,dm:100,muG:0.012,to:3,tw:3});
console.log(s.rhoG,s.rhoO,s.Z,s.Vt,s.Cd,s.dLg,s.d2L);console.log(s.rows.map(r=>[r.d,r.Lg.toFixed(1),r.Ll.toFixed(1),r.Lss.toFixed(1),r.SR.toFixed(1),r.ok]).join('\n'),s.best&&s.best.d);
console.log('stokes',c.stokesV(100e-6,150,0.001)*1000,'mm/s', c.stokesCut(0.001,150,0.001)*1e6);
console.log('comp',c.compressor({P1:50,T1:100,P2:1000,Q:5,gg:0.75,k:1.27,eta:0.78,rmax:4}));
console.log('hammer',c.hammerschmidt(20,'MeOH'),c.hammerschmidt(20,'MEG'));
console.log('crude',c.crudeCorr(32,100),c.crudeCorr(32,60));
console.log('pipe',c.pipeline({Q:20000,id:12.25,Lmi:50,eps:0.0018,api:32,mu:10,dz:200,Pdel:50}));
console.log('stage',c.stageBalance({qL:2000,wc:30,gor:600,api:32,gg:0.75,Tres:180,Psep1:150,Psep2:25}));
console.log('mu',c.muDeadOil(32,110),c.muDeadOil(32,180),c.muDeadOil(20,100));
