export {
  defineAdapter,
  validateAdapter,
  type Adapter,
  type AdapterConfig,
  type AdapterOutput,
  type AdapterParams,
  type AnyAdapter,
} from "./adapter.js";

export {
  defineWorkflow,
  validateWorkflow,
  type AnyWorkflow,
  type Workflow,
  type WorkflowAction,
  type WorkflowActionWithPrefilled,
  type WorkflowConfig,
  type WorkflowContext,
  type WorkflowInput,
  type WorkflowOutput,
} from "./workflow.js";

export {
  defineBlock,
  validateBlock,
  type ActionRef,
  type AnyBlock,
  type Block,
  type BlockConfig,
  type BlockProps,
  type DataSlot,
  type PageStateWrite,
  type PageStateWriter,
  type ParamSource,
} from "./block.js";

export {
  DOTTED_ID_REGEX,
  SEMVER_REGEX,
  manifestMetadataSchema,
  type ManifestMetadata,
} from "./common.js";

export type {
  AuthRequest,
  AuthenticateFn,
  AuthorizeFn,
  EnrichContextFn,
  Identity,
  NavigationItem,
  ProductInfo,
  ReferenceData,
  ReferenceDataFn,
  ReferenceItem,
  Registry,
} from "./registry.js";

export { productInfoSchema, validateProductInfo } from "./registry.js";
