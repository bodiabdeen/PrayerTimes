//  RNWidgetModule.m
//  Exposes WidgetModule to React Native

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WidgetModule, NSObject)
RCT_EXTERN_METHOD(updateWidget:(NSDictionary *)prayerData)
@end
