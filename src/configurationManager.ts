const entityFactory = require('mozu-node-sdk/clients/platform/entitylists/entity');

//export const NAMESPACE = ''; <----- replace with your dev account namespace
export const ENTITY_LIST = 'shippingconfig';
export const ENTITY_FULL = `${ENTITY_LIST}@${NAMESPACE}`;
export const ENTITY_ID = 'shippingExtConfig';

export interface ShippingExtConfig {
  id: string;
  entityListFullName: string;
  percentageFee: number;
}

let configurationPromise: Promise<ShippingExtConfig> | undefined;

export const resetConfigPromise = (): void => {
  configurationPromise = undefined;
};

export const getConfig = (context: any, options?: { configResource?: any }): Promise<ShippingExtConfig> => {
  const configResource = options?.configResource
    ? options.configResource
    : entityFactory(context.apiContext ?? context);

  configurationPromise = configurationPromise || configResource.getEntity({
    entityListFullName: ENTITY_FULL,
    id: ENTITY_ID
  }).catch((err: any) => {
    throw new Error('Shipping extension configuration could not be retrieved');
  });

  return configurationPromise!;
};
