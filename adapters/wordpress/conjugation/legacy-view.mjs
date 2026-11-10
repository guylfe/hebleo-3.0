import assert from 'node:assert/strict';
// The existing seven-file installation uses the separate approved help add-on.
// Preserve that owner while applying the shared engine/setup changes.
export function legacyWordpressView(source){
  let result=source.replaceAll('\r\n','\n');
  for(const [before,after]of [["import {helpControl,bindPracticeHelp} from './help.js';\n",''],["${helpControl('conjugation')}",''],['  const help=bindPracticeHelp(root,{platform});\n',''],['destroy(){help.destroy();','destroy(){']]){
    assert.equal(result.split(before).length,2,'Expected existing help boundary');result=result.replace(before,after);
  }
  return result;
}
