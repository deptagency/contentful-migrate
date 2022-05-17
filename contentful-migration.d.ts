// TODO: Get rid of this file once https://github.com/contentful/contentful-migration/pull/1081
// is merged

declare module 'contentful-migration/built/lib/errors' {
  declare class SpaceAccessError extends Error {
    constructor();
  }
  exports = { SpaceAccessError }
}

declare module 'contentful-migration/built/lib/interfaces/intent' {
  // import { APIAction, EntityAction } from '../action/action';
  // import RawStep from './raw-step';
  // import { PlanMessage } from './plan-message';
  type APIAction = any;
  type EntityAction = any;
  type RawStep = any;
  type PlanMessage = any;
  interface Intent {
      toActions(): (APIAction | EntityAction)[];
      toRaw(): RawStep;
      getContentTypeId(): string;
      getRelatedContentTypeIds(): string[];
      getFieldId(): string;
      getInvalidMethod(): string;
      getFieldGroupId(): string;
      getNewFieldGroupId(): string;
      getFieldGroupProps(): {
          [prop: string]: string;
      };
      getRawType(): string;
      getTagId(): string;
      requiresAllEntries(): boolean;
      requiresAllTags(): boolean;
      requiresContentType(): boolean;
      shouldSave(): boolean;
      shouldPublish(): boolean;
      isContentTypeUpdate(): boolean;
      isContentTypeDelete(): boolean;
      isContentTypeCreate(): boolean;
      isFieldCreate(): boolean;
      isFieldUpdate(): boolean;
      isFieldDelete(): boolean;
      isFieldRename(): boolean;
      isFieldMove(): boolean;
      isAboutContentType(): boolean;
      isAboutField(): boolean;
      isAboutEditorLayout(): boolean;
      isContentTransform(): boolean;
      isEntryDerive(): boolean;
      isEntryTransformToType(): boolean;
      isGroupable(): boolean;
      isEditorInterfaceIntent(): boolean;
      isEditorInterfaceUpdate(): boolean;
      isSidebarUpdate(): boolean;
      isTagIntent(): boolean;
      isTagCreate(): boolean;
      isTagUpdate(): boolean;
      isTagDelete(): boolean;
      isEntrySetTags(): boolean;
      isEditorLayoutCreate(): boolean;
      isEditorLayoutDelete(): boolean;
      isEditorLayoutUpdate(): boolean;
      isEditorLayoutInvalidMethod(): boolean;
      isFieldGroupCreate(): boolean;
      isFieldGroupDelete(): boolean;
      isFieldGroupUpdate(): boolean;
      isFieldGroupIdChange(): boolean;
      isFieldGroupControlChange(): boolean;
      isComposedIntent(): boolean;
      groupsWith(other: Intent): boolean;
      endsGroup(): boolean;
      toPlanMessage(): PlanMessage;
  }
  export { Intent as default, Intent };

}

declare module 'contentful-migration/built/lib/interfaces/errors' {
  import { Intent } from 'contentful-migration/built/lib/interfaces/intent'
  interface ValidationError {
    type: string;
    message: string;
    details?: {
        intent: Intent;
    };
  }
  interface PayloadValidationError extends ValidationError {
      type: 'InvalidPayload';
      message: string;
  }
  interface InvalidActionError extends ValidationError {
      type: 'InvalidAction';
      message: string;
  }
  interface InvalidTypeError extends ValidationError {
      type: 'InvalidType';
      message: string;
      details: {
          intent: Intent;
      };
  }
  interface InvalidMovementError extends ValidationError {
      type: 'InvalidMovement';
      message: string;
      details: {
          intent: Intent;
      };
  }
  interface InvalidPropertyError extends ValidationError {
      type: 'InvalidProperty';
      message: string;
  }
  export { ValidationError as default, PayloadValidationError,
    InvalidActionError, InvalidTypeError, InvalidMovementError, InvalidPropertyError };
}

declare module 'contentful-migration/built/lib/offline-api' {
  export interface RequestBatch {
    intent: Intent;
    requests: Request[];
    validationErrors: (PayloadValidationError | InvalidActionError)[];
    runtimeErrors: Error[];
  }

}

declare module 'contentful-migration/built/lib/migration-parser' {
  import { ClientConfig } from 'contentful-migration'
  declare class ParseResult {
    public batches: RequestBatch[];
    public stepsValidationErrors: ValidationError[];
    public payloadValidationErrors: InvalidActionError[] | ValidationError[];

    hasValidationErrors(): boolean;
    hasRuntimeErrors(): boolean;
    hasStepsValidationErrors(): boolean;
    hasPayloadValidationErrors(): boolean;
    getRuntimeErrors(): Error[];
    getValidationErrors(): ValidationError[];
  }
  declare function createMigrationParser(
    // eslint-disable-next-line @typescript-eslint/ban-types
    makeRequest: Function, config: ClientConfig
  ): (migrationCreator: (migration: any) => any) => Promise<ParseResult>;
  export default createMigrationParser;
}

declare module 'contentful-migration/built/bin/lib/contentful-client' {
  declare function createManagementClient(params: any): import("contentful-management").PlainClientAPI;
  export { createManagementClient };
}

declare module 'contentful-migration/built/bin/lib/render-migration' {
  import { RequestBatch } from 'contentful-migration/built/lib/offline-api';
  declare const renderPlan: (batches: RequestBatch[], environment: string, isQuiet?: boolean) => void;
  declare const renderValidationErrors: (batches: RequestBatch[], environment: string) => void;
  declare const renderRuntimeErrors: (batches: RequestBatch[], filename: string) => void;
  export { renderPlan, renderValidationErrors, renderRuntimeErrors };
}

declare module 'contentful-migration/built/bin/lib/steps-errors' {
  import ValidationError from 'contentful-migration/built/lib/interfaces/errors';
  declare const renderStepsErrors: (errors: ValidationError[]) => void;
  export default renderStepsErrors;
}

declare module 'contentful-migration/built/bin/lib/write-errors-to-log' {
  declare const writeErrorsToLog: (errors: Error | Error[], filename: string) => Promise<void>;
  export default writeErrorsToLog;

}

declare module 'contentful-migration/built/bin/cli' {
  import type { AxiosRequestConfig } from 'axios';
  import { PlainClientAPI } from 'contentful-management';
  export declare const createMakeRequest: (client: PlainClientAPI, { spaceId, environmentId }: {
      spaceId: any;
      environmentId: any;
  }) => (requestConfig: AxiosRequestConfig) => Promise<unknown>;
  export declare const runMigration: (argv: any) => Promise<any>;
  declare const _default: (argv: any) => Promise<any>;
  export default _default;
}
