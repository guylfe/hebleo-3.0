import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));
const path=resolve(here,'REVISION.json'),r=JSON.parse(readFileSync(path,'utf8'));
r.status='Reconciled for local testing by Leo; exact copy saved/read back in canonical authoring master. Guy final copy/design acceptance pending. No software installation.';
r.authorship='Guy-authored source with concise editorial adaptation by Curriculum, reconciled by Leo for local testing. Exact learner wording remains the source copy at 15fc734cc1b0a25492a81ca5e96052de5f1d9e62. No final Guy acceptance claimed.';
r.reconciliation={decisionSource:'FIRST2_INTEGRATION_DECISIONS_20261031.json',decisionDate:'2026-10-31',sourceCopyCommit:'15fc734cc1b0a25492a81ca5e96052de5f1d9e62',masterReceipt:'MASTER_UPDATE_VERIFIED.json',runtimeOwner:'Lead Engineer',guyFinalAcceptance:'Pending'};
r.pages[2].accessibleStudyAlternative={collapsedByDefault:true,exactDigits:'0704177609112001',controls:['Hide-and-recall','Skip'],timedPerformanceEquivalent:false,newAudioOrTtsRequired:false,defaultHearDigitsOnceControl:false};
r.pages[3].principleInteraction={kind:'numbered expandable rows',allRowsDirectlyAvailable:true,firstMayOpenAfterDemonstration:true,keepEarlierOpenedContent:true,boldTitles:true,continueRequiresOpeningAll:false,lockedRows:false,timedAutoAdvance:false,keepFocusOnActivatedRow:true};
r.pages[4].inlineOptional.completionRequired=false;
for(const t of r.feedbackTreatments){
 if(t.id===5)t.resolution='Remove Hear the digits once from default controls. Use a collapsed accessible/untimed study alternative with exact digits and Hide-and-recall/skip, explicitly not equivalent timed performance; no new audio asset or speech synthesis. Lead verifies assistive behavior.';
 if(t.id===10)t.resolution='Reconciled by Leo: numbered expandable rows with bold titles, all directly available; keep earlier opened content and keyboard focus. Continue never requires opening all three. No locked row, completion gate or timed auto-advance.';
 if(t.id===12)t.resolution='Reconciled by Leo for local testing: remove MEMORY-A2.embedded.what-changed and all active quiz dependencies. Preserve original question/options/answer/feedback in inactive master history, baseline and historical revisions. Add no replacement assessment or mastery claim.';
}
writeFileSync(path,JSON.stringify(r,null,2)+'\n');
// Deliberately do not modify the exact learner-copy artifact: its committed hash is canonical.
console.log(JSON.stringify({status:r.status,learnerCopyUnchanged:true,interaction:r.pages[3].principleInteraction}));
