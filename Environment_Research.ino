#if defined(ESP32)
  #include <WiFiMulti.h>
  WiFiMulti wifiMulti;
  #define DEVICE "ESP32"
#elif defined(ESP8266)
  #include <ESP8266WiFiMulti.h>
  ESP8266WiFiMulti wifiMulti;
  #define DEVICE "ESP8266"
#endif

#include <InfluxDbClient.h>
#include <InfluxDbCloud.h>
#include <DHT.h>
#include <math.h>

// WiFi credentials
#define WIFI_SSID "Fred"
#define WIFI_PASSWORD "HelloWorld"

// InfluxDB v2 Cloud config
#define INFLUXDB_URL "https://us-east-1-1.aws.cloud2.influxdata.com"
#define INFLUXDB_TOKEN "dx4LX6eGrdzhv0w4kS6tJlFx4aWPZ4DBUmcqxHQ2RWmCT-n4VfOAPOfz8rBKkSaEZpYzczFtnYIS6m1rAtsVFQ=="
#define INFLUXDB_ORG "b087e677b6a00835"
#define INFLUXDB_BUCKET "environmental"

// Timezone
#define TZ_INFO "UTC0"

// Pins
#define MQ5_PIN   32
#define MQ135_PIN 33
#define MQ9_PIN   34
#define DHT_PIN   27
#define DHT_TYPE  DHT11

// Sensor Load Resistor (RL) in kΩ
#define RL_MQ5     10.0
#define RL_MQ135   10.0
#define RL_MQ9     10.0

// Calibrated clean air resistance (R0) - CHANGE based on your calibration
#define R0_MQ5     3.6
#define R0_MQ135   10.0
#define R0_MQ9     9.8

#define ADC_MAX    4095.0
#define V_REF      3.3

// Sensor Instances
DHT dht(DHT_PIN, DHT_TYPE);

// InfluxDB client
InfluxDBClient client(INFLUXDB_URL, INFLUXDB_ORG, INFLUXDB_BUCKET, INFLUXDB_TOKEN, InfluxDbCloud2CACert);

// Data points
Point wifiPoint("wifi_status");
Point envPoint("environment_status");

// Helper: calculate RS
float calculateRS(int adcValue, float RL) {
  float voltage = adcValue * (V_REF / ADC_MAX);
  return (V_REF - voltage) * RL / voltage;
}

// LPG from MQ5
float mq5_getLPGppm(int adcValue) {
  float RS = calculateRS(adcValue, RL_MQ5);
  float ratio = RS / R0_MQ5;
  return pow(10, (-0.47 * log10(ratio) + 1.76));
}

// NH3 from MQ135
float mq135_getNH3ppm(int adcValue) {
  float RS = calculateRS(adcValue, RL_MQ135);
  float ratio = RS / R0_MQ135;
  return pow(10, (-0.48 * log10(ratio) + 1.85));
}

// CO from MQ9
float mq9_getCOppm(int adcValue) {
  float RS = calculateRS(adcValue, RL_MQ9);
  float ratio = RS / R0_MQ9;
  return pow(10, (-0.77 * log10(ratio) + 1.699));
}

void setup() {
  Serial.begin(115200);
  dht.begin();

  // Connect to WiFi
  WiFi.mode(WIFI_STA);
  wifiMulti.addAP(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (wifiMulti.run() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.println("\nConnected to WiFi");

  // Add tags
  wifiPoint.addTag("device", DEVICE);
  wifiPoint.addTag("SSID", WiFi.SSID());
  envPoint.addTag("device", DEVICE);
  envPoint.addTag("SSID", WiFi.SSID());

  // Sync time
  timeSync(TZ_INFO, "pool.ntp.org", "time.nis.gov");

  // Check InfluxDB connection
  if (client.validateConnection()) {
    Serial.print("Connected to InfluxDB: ");
    Serial.println(client.getServerUrl());
  } else {
    Serial.print("InfluxDB connection failed: ");
    Serial.println(client.getLastErrorMessage());
  }
}

void loop() {
  // ==== WiFi Signal ====
  wifiPoint.clearFields();
  wifiPoint.addField("rssi", WiFi.RSSI());
  if (!client.writePoint(wifiPoint)) {
    Serial.print("WiFi write failed: ");
    Serial.println(client.getLastErrorMessage());
  } else {
    Serial.println("WiFi RSSI write successful.");
  }

  // ==== Environmental Data ====
  float temp = dht.readTemperature();
  float humidity = dht.readHumidity();
  int mq5Adc = analogRead(MQ5_PIN);
  int mq135Adc = analogRead(MQ135_PIN);
  int mq9Adc = analogRead(MQ9_PIN);

  float lpg_ppm = mq5_getLPGppm(mq5Adc);
  float nh3_ppm = mq135_getNH3ppm(mq135Adc);
  float co_ppm = mq9_getCOppm(mq9Adc);

  envPoint.clearFields();
  if (!isnan(temp)) envPoint.addField("temperature", temp);
  if (!isnan(humidity)) envPoint.addField("humidity", humidity);
  envPoint.addField("LPG_ppm", lpg_ppm);
  envPoint.addField("NH3_ppm", nh3_ppm);
  envPoint.addField("CO_ppm", co_ppm);

  Serial.printf("Temp: %.2f °C, Humidity: %.2f %%\n", temp, humidity);
  Serial.printf("LPG: %.2f ppm, NH3: %.2f ppm, CO: %.2f ppm\n", lpg_ppm, nh3_ppm, co_ppm);

  if (!client.writePoint(envPoint)) {
    Serial.print("Environmental data write failed: ");
    Serial.println(client.getLastErrorMessage());
  } else {
    Serial.println("Environmental data write successful.");
  }

  Serial.println("Waiting 10s...\n");
  delay(10000);
}
