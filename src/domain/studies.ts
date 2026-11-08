// The trainer's other studies, by protocol number.
import type { StudyPack } from './studypack'
import { PK_PACK } from './pk'
import { ONK_PACK } from './onc'
import { AIR_PACK } from './air'
import { VAX_PACK } from './vax'

export const PACKS: Record<string, StudyPack> = { [PK_PACK.id]: PK_PACK, [ONK_PACK.id]: ONK_PACK, [AIR_PACK.id]: AIR_PACK, [VAX_PACK.id]: VAX_PACK }
