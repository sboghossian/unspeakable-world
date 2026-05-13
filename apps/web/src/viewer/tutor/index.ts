/**
 * 🎓 Tutoring — public entry point.
 *
 * Re-exports the session runtime and the wire-format codec so the rest
 * of the viewer can pull in everything from one import. Keep this thin:
 * just types + the two factory functions.
 */

export {
  becomeTeacher,
  joinAsStudent,
  probeTutorHealth,
  type TeacherEvent,
  type TeacherHandle,
  type StudentEvent,
  type StudentHandle,
} from "./session";

export {
  buildTutorHash,
  decodeTutorState,
  encodeTutorState,
  generateSessionCode,
  isValidSessionCode,
  normaliseSessionCode,
  normaliseTutorState,
  parseTutorHash,
  SESSION_CODE_LENGTH,
  type TutorMode,
  type TutorState,
} from "./state-codec";
