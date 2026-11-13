import { listCoaches } from '../../../api/index.ts'
import { useResource } from './useResource.ts'

/** Loads coach choices; mount it only while the create view is open. */
export function useCoaches() {
  return useResource(listCoaches)
}
