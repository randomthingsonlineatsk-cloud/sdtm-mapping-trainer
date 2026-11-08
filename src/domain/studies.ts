// The trainer's other studies, by protocol number.
import type { StudyPack } from './studypack'
import { PK_PACK } from './pk'
import { ONK_PACK } from './onc'
import { AIR_PACK } from './air'
import { VAX_PACK } from './vax'
import { SEND_PACK } from './send'
import { INS_PACK } from './ins'
import { CVO_PACK } from './cvo'
import { PAIN_PACK } from './pain'

export const PACKS: Record<string, StudyPack> = { [PK_PACK.id]: PK_PACK, [ONK_PACK.id]: ONK_PACK, [AIR_PACK.id]: AIR_PACK, [VAX_PACK.id]: VAX_PACK, [SEND_PACK.id]: SEND_PACK, [INS_PACK.id]: INS_PACK, [CVO_PACK.id]: CVO_PACK, [PAIN_PACK.id]: PAIN_PACK }
