import { ShippingItemRate } from "@kibocommerce/rest-sdk/clients/ShippingStorefront/models/ShippingItemRate";
import { ActionId, RatesContext, createArcFunction } from "./arcTypes/index";
import { exampleConfig, platformApplicationsInstallImplementation } from "./platformInstall";
import { getConfig } from "./configurationManager";

const requestRatesBefore = createArcFunction(
  ActionId["http.commerce.catalog.storefront.shipping.requestRates.before"],
  async function (context: RatesContext, callback: (errorMessage?: string) => void) {
    console.log("http.commerce.catalog.storefront.shipping.requestRates.before")
    const config = context.configuration

    if (config.rateCode == null || config.rateName == null || config.carrierId == null) {
      // Something in the config isn't correct, pass through to the default rates
      console.error("Configuration missing values, custom rates cannot run")
      callback()
      return
    }

    const itemRates: Array<ShippingItemRate> = (context.request.body.items || []).map(item => {
      for (const group of config.shippingGroups) {
        for (const productSummaries of item.productSummaries || []) {
          if (productSummaries.productCode && group.productCodes?.includes(productSummaries.productCode)) {
            return {
              itemId: item.itemId,
              quantity: item.quantity,
              amount: group.shippingPerItem * (item.quantity || 1)
            }
          }

          if (productSummaries.productType && group.productTypes?.includes(productSummaries.productType)) {
            return {
              itemId: item.itemId,
              quantity: item.quantity,
              amount: group.shippingPerItem * (item.quantity || 1)
            }
          }
        }
      }

      // Fallthrough, if in none of the groups, free shipping
      return {
        itemId: item.itemId,
        quantity: item.quantity,
        amount:0
      }
    })

    // Calculate the total from the sum of the line items
    let total = 0;
    for (const rate of itemRates) {
      total += rate.amount || 0
    }

    // Apply percentage fee from entity config
    let percentageFee = 0;
    try {
      const extConfig = await getConfig(context as any);
      percentageFee = extConfig.percentageFee || 0;
    } catch {
      // config unavailable — proceed with no fee
    }
    total = parseFloat((total * (1 + percentageFee / 100)).toFixed(2));

    // Return the rates response
    context.response.body = {
      resolvedShippingZoneCode: "",
      shippingZoneCodes: [],
      rates: [
        {
          carrierId: config.carrierId,
          shippingRates: [
            {
              code: config.rateCode,
              content: {
                localeCode: "en-US",
                name: config.rateName
              },
              amount: total,
              shippingItemRates: itemRates,
              customAttributes: [],
              messages: []
            }
          ]
        }]
    }

    callback();
  }
);

const requestRatesAfter = createArcFunction(
  ActionId["http.commerce.catalog.storefront.shipping.requestRates.after"],
  function (context: RatesContext, callback: (errorMessage?: string) => void) {
    console.log("http.commerce.catalog.storefront.shipping.requestRates.after")
})

const platformApplicationsInstall = createArcFunction(
  ActionId["embedded.platform.applications.install"],
  function (context: any, callback: (errorMessage?: string) => void) {
    console.log("platformApplicationsInstall");
    platformApplicationsInstallImplementation(context, callback).then(() => {
      callback()
    })
  }
);

export default {
  "http.commerce.catalog.storefront.shipping.requestRates.before": requestRatesBefore,
  "http.commerce.catalog.storefront.shipping.requestRates.after": requestRatesAfter,
  "embedded.platform.applications.install": platformApplicationsInstall,
}