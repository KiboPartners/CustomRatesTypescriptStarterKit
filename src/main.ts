import { ShippingItemRate } from "@kibocommerce/rest-sdk/clients/ShippingStorefront/models/ShippingItemRate";
import { ActionId, RatesContext, createArcFunction } from "./arcTypes/index";
import { exampleConfig, platformApplicationsInstallImplementation } from "./platformInstall";
import { CarrierRatesResponse } from "@kibocommerce/rest-sdk/clients/ShippingStorefront/models/CarrierRatesResponse";


const requestRatesBefore = createArcFunction(
  ActionId["http.commerce.catalog.storefront.shipping.requestRates.before"],
  function (context: RatesContext, callback: (errorMessage?: string) => void) {
    console.log("http.commerce.catalog.storefront.shipping.requestRates.before")
    const config = context.configuration
  
    console.log(JSON.stringify(context.request.body))
    const itemRates: Array<ShippingItemRate> = (context.request.body.items || []).map(item => {
      // Fallthrough, if in none of the groups, free shipping
      return {
        itemId: item.itemId,
        quantity: item.quantity,
        amount: 5
      }
    })

    // Calculate the total from the sum of the line items
    let total = 0;
    for (const rate of itemRates) {
      total += rate.amount || 0
    }

    // Return the rates response
    context.response.body = {
      resolvedShippingZoneCode: "",
      shippingZoneCodes: [],
      rates: [
        {
          carrierId: "Delivery",
          fulfillmentMethod: "Delivery",
          shippingRates: [
            {
              code: "default",
              content: {
                localeCode: "en-US",
                name: "Delivery"
              },
              amount: total,
              shippingItemRates: itemRates,
              customAttributes: [],
              messages: []
            }
          ]
        } as CarrierRatesResponse & {fulfillmentMethod: string}]
    }
    console.log(JSON.stringify(context.response.body))

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