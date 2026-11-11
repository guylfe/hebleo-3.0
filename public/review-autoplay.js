// One automatic attempt per card face. Manual controls remain available on failure.
export function createReviewAutoplay({play,stop}) {
 let previousSession=null,previousKey=null;
 return ({session,card,revealed,enabled,speed=1,active=true})=>{
  const key=active&&session&&card&&!card.shared ? `${session.index}:${card.id}:${revealed}:${enabled}` : null;
  if(session===previousSession&&key===previousKey)return;
  if(previousKey!==null)stop();previousSession=session;previousKey=key;
  if(!key||!enabled||!card.audio||(!revealed&&session.type==='translation'))return;
  Promise.resolve(play(card.audio,speed,true)).catch(()=>{});
 };
}
