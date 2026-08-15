const { PAIRS, fetchAllPrices } = require('./data');

function logReturns(prices) {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
        if (prices[i-1].close > 0 && prices[i].close > 0) returns.push({ timestamp: prices[i].timestamp, return: Math.log(prices[i].close / prices[i-1].close) });
    }
    return returns;
}
function pearson(x, y) {
    if (x.length !== y.length || x.length < 3) return null;
    const mx = x.reduce((a,b)=>a+b,0)/x.length, my = y.reduce((a,b)=>a+b,0)/y.length;
    const numerator = x.reduce((s,xi,i)=>s+(xi-mx)*(y[i]-my),0);
    const dx = Math.sqrt(x.reduce((s,xi)=>s+(xi-mx)**2,0)), dy = Math.sqrt(y.reduce((s,yi)=>s+(yi-my)**2,0));
    if (dx===0 || dy===0) return null;
    return numerator/(dx*dy);
}
function linearRegression(x, y) {
    const mx=x.reduce((a,b)=>a+b,0)/x.length, my=y.reduce((a,b)=>a+b,0)/y.length;
    const denominator=x.reduce((s,xi)=>s+(xi-mx)**2,0);
    if (denominator===0) return {alpha:0,beta:0};
    const beta=x.reduce((s,xi,i)=>s+(xi-mx)*(y[i]-my),0)/denominator;
    return {alpha:my-beta*mx,beta};
}
function findBestLag(leaderReturns, followerReturns) {
    let bestLag=1,bestCorr=null;
    for(let lag=1;lag<=24;lag++){
        const pairs=[];
        for(let i=0;i<leaderReturns.length-lag;i++) pairs.push({leader:leaderReturns[i].return,follower:followerReturns[i+lag].return});
        if(pairs.length<20) continue;
        const corr=pearson(pairs.map(p=>p.leader),pairs.map(p=>p.follower));
        if(corr!==null && (bestCorr===null || Math.abs(corr)>Math.abs(bestCorr))){bestCorr=corr;bestLag=lag;}
    }
    return {lag:bestLag,correlation:bestCorr};
}
function generateSignalForPair(pair, prices, btcPrices) {
    try {
        if(pair==='BTC-USDT-SWAP') return {pair,zscore:0,direction:'NEUTRAL',lag:0,correlation:null,price:prices[prices.length-1]?.close||0,signal:'LEADER'};
        const btcReturns=logReturns(btcPrices), followerReturns=logReturns(prices);
        if(btcReturns.length<50 || followerReturns.length<50) return {pair,zscore:0,direction:'NEUTRAL',lag:0,correlation:null,price:prices[prices.length-1]?.close||0,signal:'INSUFFICIENT_DATA'};
        const {lag,correlation}=findBestLag(btcReturns,followerReturns);
        if(correlation===null) return {pair,zscore:0,direction:'NEUTRAL',lag:lag||0,correlation:null,price:prices[prices.length-1]?.close||0,signal:'NO_CORRELATION'};
        const pairs=[];
        for(let i=0;i<btcReturns.length-lag;i++) pairs.push({leader:btcReturns[i].return,follower:followerReturns[i+lag].return});
        if(pairs.length<20) return {pair,zscore:0,direction:'NEUTRAL',lag,correlation,price:prices[prices.length-1]?.close||0,signal:'INSUFFICIENT_DATA'};
        const x=pairs.map(p=>p.leader), y=pairs.map(p=>p.follower), {alpha,beta}=linearRegression(x,y);
        const residuals=pairs.map(p=>p.follower-(alpha+beta*p.leader));
        const recent=residuals.slice(-168), mean=recent.reduce((a,b)=>a+b,0)/recent.length, variance=recent.reduce((a,b)=>a+(b-mean)**2,0)/recent.length, std=Math.sqrt(variance);
        const zscore=std>0?(residuals[residuals.length-1]-mean)/std:0;
        let direction='NEUTRAL',confidence=0;
        if(zscore>2){direction='SHORT';confidence=Math.min(zscore-2,1);} else if(zscore<-2){direction='LONG';confidence=Math.min(-zscore-2,1);}
        return {pair,zscore:Math.round(zscore*10000)/10000,direction,confidence:Math.round(confidence*100),lag,correlation:Math.round(correlation*10000)/10000,price:prices[prices.length-1]?.close||0,signal:'ACTIVE'};
    } catch(error){return {pair,zscore:0,direction:'NEUTRAL',lag:0,correlation:null,price:0,signal:'ERROR',error:error.message};}
}

async function generateAllSignals(){
    try{
        const allPrices=await fetchAllPrices(), btcPrices=allPrices['BTC-USDT-SWAP'];
        if(!btcPrices) throw new Error('Failed to fetch BTC prices');
        const results={};
        for(const pair of PAIRS){const prices=allPrices[pair];if(!prices){results[pair]={pair,zscore:0,direction:'NEUTRAL',lag:0,correlation:null,price:0,signal:'NO_DATA'};continue;}results[pair]=generateSignalForPair(pair,prices,btcPrices);}
        return results;
    }catch(error){throw new Error(`Signal generation failed: ${error.message}`);}
}

function analyzeLeadLagPair(pair, prices, btcPrices, limit=80) {
    if(pair==='BTC-USDT-SWAP') return {pair,leader:'BTC',follower:'BTC',available:false,reason:'BTC is the leader and has no self lead-lag relationship.'};
    const leaderReturns=logReturns(btcPrices), followerReturns=logReturns(prices);
    if(leaderReturns.length<50||followerReturns.length<50) return {pair,leader:'BTC',follower:pair.replace('-USDT-SWAP',''),available:false,reason:'Insufficient hourly data.'};
    const {lag,correlation}=findBestLag(leaderReturns,followerReturns);
    if(correlation===null) return {pair,leader:'BTC',follower:pair.replace('-USDT-SWAP',''),available:false,reason:'No measurable correlation in the available sample.'};
    const aligned=[];
    for(let i=0;i<leaderReturns.length-lag;i++) aligned.push({timestamp:followerReturns[i+lag].timestamp,leaderReturn:leaderReturns[i].return,followerReturn:followerReturns[i+lag].return});
    if(aligned.length<20) return {pair,leader:'BTC',follower:pair.replace('-USDT-SWAP',''),available:false,reason:'Insufficient aligned observations.'};
    const x=aligned.map(p=>p.leaderReturn), y=aligned.map(p=>p.followerReturn), {alpha,beta}=linearRegression(x,y);
    const residuals=aligned.map(p=>p.followerReturn-(alpha+beta*p.leaderReturn));
    const recent=residuals.slice(-168), mean=recent.reduce((a,b)=>a+b,0)/recent.length, variance=recent.reduce((a,b)=>a+(b-mean)**2,0)/recent.length, std=Math.sqrt(variance);
    const zscore=std>0?(residuals[residuals.length-1]-mean)/std:0;
    const visible=aligned.slice(-limit); let leaderCum=0,followerCum=0;
    const series=visible.map(point=>{leaderCum+=point.leaderReturn;followerCum+=point.followerReturn;return {timestamp:point.timestamp,leaderCumulativeReturn:leaderCum,followerCumulativeReturn:followerCum,leaderReturn:point.leaderReturn,followerReturn:point.followerReturn};});
    return {pair,leader:'BTC',follower:pair.replace('-USDT-SWAP',''),available:true,lagHours:lag,correlation:Math.round(correlation*10000)/10000,alpha,beta,zscore:Math.round(zscore*10000)/10000,series,note:'Uses the same hourly log returns, 1-24h lag search, Pearson correlation and linear regression as the Gizmo signal engine.'};
}

module.exports={PAIRS,generateAllSignals,generateSignalForPair,analyzeLeadLagPair};