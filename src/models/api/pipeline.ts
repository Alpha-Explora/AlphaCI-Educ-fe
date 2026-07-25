// MODEL LAYER — Pipeline resource
import { apiRequest } from "./client";
import type { PipelineRunDetail } from "../types";

export const pipelineApi = {
  run(id: string) {
    return apiRequest<PipelineRunDetail>(`/pipeline-runs/${id}`);
  },
};
