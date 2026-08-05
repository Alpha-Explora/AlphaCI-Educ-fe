// ============================================================================
// MODEL LAYER — Custom projects resource (teacher-authored reusable starters).
//
// AUTHOR-ONLY, enforced server-side. Every route below answers about the CALLER's
// own projects, so none of them takes an owner or a class: there is no request
// this module can make that would reach another teacher's work, which is why
// nothing here has a "whose?" parameter to get wrong.
//
// Note the asymmetry with /assignments/templates. That endpoint lists these
// projects — flagged `custom: true` — but sends file PATHS only, because it is
// what the picker reads and a picker has no business holding an answer key. Full
// contents come from `get` alone, which is called only when a teacher opens
// their own project to edit it.
// ============================================================================
import { apiRequest } from "./client";
import type { CustomProject, CustomProjectInput } from "../types";

export const customProjectsApi = {
  /**
   * Every custom project the caller has written, with full contents.
   *
   * The picker does NOT use this — it reads /assignments/templates, which
   * returns built-ins and custom projects in one list already filtered to the
   * paths a picker may see. This exists for the management surfaces that address
   * a teacher's library directly, and is the only route that answers "what have
   * I written" without a language in the question.
   */
  list() {
    return apiRequest<CustomProject[]>(`/custom-projects`);
  },

  /**
   * One project INCLUDING solution and hidden-test contents.
   *
   * The only route that serves those, and therefore the only one an editor may
   * call. Everything else in the app that names a custom project should be
   * reading the catalogue instead.
   */
  get(id: string) {
    return apiRequest<CustomProject>(`/custom-projects/${id}`);
  },

  create(input: CustomProjectInput) {
    return apiRequest<CustomProject>(`/custom-projects`, {
      method: "POST",
      body: input,
    });
  },

  /**
   * PATCH rather than PUT, and sent whole anyway.
   *
   * The editor loads the entire project, so it always has a complete document to
   * send; a partial patch would let two open tabs each write half of one and
   * leave a project whose brief describes files it no longer has.
   */
  update(id: string, input: CustomProjectInput) {
    return apiRequest<CustomProject>(`/custom-projects/${id}`, {
      method: "PATCH",
      body: input,
    });
  },

  /**
   * Deletes the project, not the assignments already built from it.
   *
   * Those repositories exist and are graded; a teacher removing a project from
   * their library is tidying what they can pick NEXT time.
   */
  remove(id: string) {
    return apiRequest<{ deleted: boolean; id: string }>(`/custom-projects/${id}`, {
      method: "DELETE",
    });
  },
};
