export { ScriptError } from "./ScriptError"
export { StatementBase } from "./StatementBase"
export { SSH } from "./ssh"
export { SFTP } from "./sftp"
export { Utility, PathInfo, PathAccess } from "./util"
export { createAssertNode, createScriptNode, createNode } from "./testUtil"
export { Log } from "./Log"

import { Utility } from "./util"

const util = new Utility()

export default util
