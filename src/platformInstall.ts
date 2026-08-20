import { ActionId, CustomRatesConfig } from "./arcTypes/index";
import { ENTITY_FULL, ENTITY_ID, NAMESPACE, ENTITY_LIST } from "./configurationManager";

const Client = require('mozu-node-sdk/client');
const entityListResourceFactory = require('mozu-node-sdk/clients/platform/entityList');
const entityResourceFactory = require('mozu-node-sdk/clients/platform/entitylists/entity');
const documentListResourceFactory = require('mozu-node-sdk/clients/content/documentlists/document');

// ─── Arc.js client ────────────────────────────────────────────────────────────

export interface ArcJSConfig {
  actions?: (ActionsEntity)[] | null;
  configurations?: (null)[] | null;
  defaultLogLevel: string;
}
export interface ActionsEntity {
  actionId: string;
  contexts?: (ContextsEntity)[] | null;
}
export interface ContextsEntity {
  customFunctions?: (CustomFunctionsEntity)[] | null;
}
export interface CustomFunctionsEntity {
  applicationKey: string;
  functionId: string;
  enabled: boolean;
  configuration: any;
}

const constants = Client.constants;
const myClientFactory = Client.sub({
  getArcConfig: Client.method({
    method: constants.verbs.GET,
    url: '{+tenantPod}api/platform/extensions'
  }),
  setArcConfig: Client.method({
    method: constants.verbs.PUT,
    url: '{+tenantPod}api/platform/extensions'
  })
}) as (context: any) => {
  getArcConfig: () => Promise<ArcJSConfig>,
  setArcConfig: (_: any, payload: { body: ArcJSConfig }) => any,
  context: any,
};

// ─── Entity list config ────────────────────────────────────────────────────────

const ENTITY_LIST_FQN = ENTITY_FULL;

const shippingConfigEntityList = {
  nameSpace: NAMESPACE,
  name: ENTITY_LIST,
  contextLevel: 'Tenant',
  useSystemAssignedId: false,
  idProperty: { propertyName: 'id', dataType: 'string' },
  isVisibleInStorefront: false,
  isLocaleSpecific: false,
  isShopperSpecific: false,
  isSandboxDataCloningSupported: false,
  views: [],
  usages: ['entityManager'],
  entityType: 'mzdb',
  listFQN: ENTITY_LIST_FQN,
  uniqueId: `mzdb-${ENTITY_LIST_FQN}`
};

const defaultConfig = {
  id: ENTITY_ID,
  entityListFullName: ENTITY_LIST_FQN,
  percentageFee: 0
};

// ─── Entity editor (admin UI) ──────────────────────────────────────────────────

const ENTITY_EDITOR_ID = 'c6f9e4b3-5d7e-8f9a-0b1c-2d3e4f5a6b7c';
const ENTITY_EDITOR_NAME = 'customRatesConfig';

const extJsCode = `Ext.create('Ext.form.Panel', {
  title: 'Custom Rates Configuration',
  bodyPadding: 10,
  defaults: { anchor: '100%', labelWidth: 200 },
  items: [{
    xtype: 'fieldset',
    title: 'Fee Configuration',
    collapsible: false,
    defaults: { anchor: '100%', labelWidth: 200 },
    items: [{
      xtype: 'numberfield',
      name: 'percentageFee',
      fieldLabel: 'Percentage Fee (%)',
      minValue: 0,
      maxValue: 100,
      decimalPrecision: 2,
      value: 0,
      allowBlank: false
    }]
  }],
  setData: function(data) {
    this.getForm().setValues(data);
    this.data = data;
  },
  getData: function() {
    var values = this.getForm().getValues();
    values.percentageFee = parseFloat(values.percentageFee) || 0;
    return Ext.applyIf(values, this.data);
  }
});`;

const entityEditor = {
  id: ENTITY_EDITOR_ID,
  name: ENTITY_EDITOR_NAME,
  documentTypeFQN: 'entityEditor@mozu',
  listFQN: 'entityEditors@mozu',
  publishState: 'none',
  publishSetCode: '',
  extension: '',
  properties: {
    documentTypes: [],
    documentLists: [],
    entityLists: [ENTITY_LIST_FQN],
    priority: 0,
    code: extJsCode
  }
};

// ─── Install helpers ───────────────────────────────────────────────────────────

async function createOrUpdateEntityList(entityListResource: any, listConfig: any): Promise<void> {
  try {
    const existing = await entityListResource.getEntityList({
      entityListFullName: `${listConfig.name}@${listConfig.nameSpace}`,
      responseFields: 'usages'
    });
    if (!existing.usages || existing.usages.length === 0) {
      await entityListResource.deleteEntityList({
        entityListFullName: `${listConfig.name}@${listConfig.nameSpace}`
      });
      await entityListResource.createEntityList({ responseFields: '' }, { body: listConfig });
    }
    // has usages — skip, preserve existing data
  } catch (e: any) {
    if (e.originalError && e.originalError.statusCode === 404) {
      await entityListResource.createEntityList({ responseFields: '' }, { body: listConfig });
    } else {
      throw e;
    }
  }
}

async function createConfigEntity(entityResource: any): Promise<void> {
  try {
    await entityResource.getEntity({
      entityListFullName: ENTITY_LIST_FQN,
      id: ENTITY_ID,
      responseFields: ''
    });
    // already exists — skip
  } catch (e: any) {
    if (e.originalError && e.originalError.statusCode === 404) {
      await entityResource.insertEntity(
        { entityListFullName: ENTITY_LIST_FQN, responseFields: '' },
        { body: defaultConfig }
      );
    } else {
      throw e;
    }
  }
}

async function createEntityEditorEntry(documentListResource: any): Promise<void> {
  const result = await documentListResource.getDocuments({
    documentListName: 'entityEditors@mozu',
    filter: `name eq ${ENTITY_EDITOR_NAME}`,
    responseFields: ''
  });
  if (result.items && result.items.length > 0) {
    await documentListResource.updateDocument(
      { documentListName: 'entityEditors@mozu', documentId: result.items[0].id, responseFields: '' },
      { body: entityEditor }
    );
  } else {
    await documentListResource.createDocument(
      { documentListName: 'entityEditors@mozu', responseFields: '' },
      { body: entityEditor }
    );
  }
}

// ─── Example Arc.js action config (used as default on first install) ──────────

export const exampleConfig: CustomRatesConfig = {
  carrierId: "Example",
  rateName: "Flat Rate",
  rateCode: "default",
  shippingGroups: [
    {
      productCodes: ["1001", "1002"],
      shippingPerItem: 17.0
    },
    {
      productTypes: ["Fulfilment"],
      shippingPerItem: 90.0
    },
    {
      productTypes: ["HardwareFulfillment"],
      shippingPerItem: 90.0
    }
  ]
};

// ─── Main install export ───────────────────────────────────────────────────────

export const platformApplicationsInstallImplementation = async (context: any, callback: (errorMessage?: string) => void) => {
  // 1. Set up entity list, default config entity, and admin UI editor
  const entityListResource = entityListResourceFactory({ context: context.apiContext });
  const entityResource = entityResourceFactory({ context: context.apiContext });
  const documentListResource = documentListResourceFactory({ context: context.apiContext });

  try {
    await createOrUpdateEntityList(entityListResource, shippingConfigEntityList);
    await createConfigEntity(entityResource);
    await createEntityEditorEntry(documentListResource);
  } catch (err) {
    console.error('Custom rates: entity setup error', err);
  }

  // 2. Register Arc.js shipping action
  const myClient = myClientFactory(context);
  const arcConfig = await myClient.getArcConfig();

  try {
    const RATES_BEFORE_ACTION = ActionId[ActionId["http.commerce.catalog.storefront.shipping.requestRates.before"]];
    const ratesBeforeContext: any = {
      customFunctions: [{
        applicationKey: context.apiContext.appKey,
        functionId: RATES_BEFORE_ACTION,
        enabled: true,
        configuration: exampleConfig
      }]
    };

    const paymentAfterAction = arcConfig.actions?.find(a => a.actionId === RATES_BEFORE_ACTION);
    if (!paymentAfterAction) {
      arcConfig.actions?.push({
        actionId: RATES_BEFORE_ACTION,
        contexts: [ratesBeforeContext]
      });
    } else if (!paymentAfterAction.contexts?.some(c => c.customFunctions?.some(f => f.applicationKey === context.apiContext.appKey))) {
      paymentAfterAction.contexts?.push(ratesBeforeContext);
    }

    await myClient.setArcConfig({}, { body: arcConfig });
  } catch (err) {
    callback("There was an error installing. " + err);
    console.error(err);
  }
};
