import { Component, OnInit, NgZone } from '@angular/core';
import { Client, Message } from 'paho-mqtt';
import * as L from 'leaflet';
import 'leaflet-routing-machine';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
  map: any;
  client: any;
  messages: any;
  mqttData: any;
  myIcon: any;
  nowMarker: any;
  lastX = 0;
  lastY = 0;
  data: any = [23.9494324, 120.9289277];

  constructor(private ngZone: NgZone) { }

  ngOnInit(): void {
    //指定欲繪製地圖在id為map的元素中，縮放程度為16
    this.map = L.map('map', { 
      center: [23.9494324, 120.9289277], 
      zoom: 16
    });

    //你要用誰的圖資
    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20,
      attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });
    tiles.addTo(this.map);

    //建立一個 mqtt 客戶端
    this.client = new Client('broker.hivemq.com', 8000, 'aaa');

    //連線MQTT
    this.client.connect({
      onSuccess: () => {
        console.log('Connected to MQTT broker');
        //訂閱主題
        this.client.subscribe('MapL');
      },
      onFailure: (err: any) => {
        console.error('Failed to connect to MQTT broker:', err);
      }
    });

    //接收消息
    this.client.onMessageArrived = (message: Message) => {
      this.ngZone.run(() => {
        this.messages = message.payloadString;
        this.mqttData = JSON.parse(this.messages);
        console.log('Message received: ', this.messages);
        console.log(this.mqttData);
        //Latitude Longitude
        this.getLine(this.mqttData.Latitude, this.mqttData.Longitude);
      });
    }

    // 座標圖示
    this.myIcon = L.icon({
      iconUrl: 'assets/marker-icon.png',
      iconRetinaUrl: 'assets/marker-icon-2x.png',
      shadowUrl: 'assets/marker-shadow.png',
      iconSize: [25, 41], // 圖示大小
      iconAnchor: [14, 40], // 圖示錨點，通常設定在圖示的底部中心點
      popupAnchor: [-2, -38] // 彈出視窗的錨點，通常設定在圖示的頂部中心點
    });
    L.Marker.prototype.options.icon = this.myIcon;

    //標示目前位置
    this.nowMarker = L
      .marker([0, 0], {title: '目前位置', icon: this.myIcon})
      .addTo(this.map)
      .bindPopup("<h3>目前位置</h3>");
  }

  //取得座標並標記
  getMarker() {
    const marker = L
      .marker(this.data, {title: '座標', icon: this.myIcon})
      .addTo(this.map)
      .bindPopup("<h3>國立暨南國際大學</h3>");
    marker.openPopup();//開啟彈出視窗
  }

  //傳送MQTT訊息
  sendMessage() {
    // 傳送訊息到 'apollos/test' 主題
    this.client.publish('MapL', JSON.stringify({x: 23.952, y: 120.9272588, name: "管理學院"})); //管院
    this.client.publish('MapL', JSON.stringify({x: 23.9515477, y: 120.9292182, name: "教育學院"})); //教院
    this.client.publish('MapL', JSON.stringify({x: 23.9551114, y: 120.9266221, name: "科技學院"})); //科院
    this.client.publish('MapL', JSON.stringify({x: 23.9506, y: 120.9297, name: "人文學院"})); //人院
  }

  //將MQTT的接收值標記在地圖上
  mqttMarker(data: any) {
    const marker = L
      .marker([Number(data[0]), Number(data[1])], {title: '座標', icon: this.myIcon})
      .addTo(this.map)
      .bindPopup("<h3>"+data[2]+"</h3>");
    marker.openPopup();//開啟彈出視窗
  }

  //畫路線(沒照地圖路線)
  getLine(nowX: number, nowY: number) {
    if(this.lastX==0 && this.lastY==0) {
      this.lastX = nowX;
      this.lastY = nowY;
    }
    
    //路線
    const linePoints: any = [
      [this.lastX, this.lastY], // 起點
      [nowX, nowY] // 終點
    ];
  
    const polyline = L.polyline(linePoints, {
      color: 'red',
      weight: 3,
      opacity: 0.7,
      lineJoin: 'round'
    }).addTo(this.map);

    //更改座標位置
    this.nowMarker.setLatLng([Number(nowX), Number(nowY)])
    this.nowMarker.openPopup(); //開啟彈出視窗
    this.map.setZoom(17);
    this.map.panTo(this.nowMarker.getLatLng());

    //const bounds = polyline.getBounds(); // 取得 polyline 的邊界
    //this.map.fitBounds(bounds); // 將地圖視圖調整到 polyline 的範圍

    //將上一個點換為目前位置
    this.lastX = nowX;
    this.lastY = nowY;
  }

  //畫路線(依照地圖路線)
  getStreetLine(nowX: number, nowY: number) {
    if(this.lastX==0 && this.lastY==0) {
      this.lastX = nowX;
      this.lastY = nowY;
    }

    const waypoints = [
      {
        latLng: L.latLng(this.lastX, this.lastY),
        name: '起點',
        draggableWaypoints: false
      },
      {
        latLng: L.latLng(nowX, nowY),
        name: '终點',
        draggableWaypoints: false
      }
    ]

    const control = L.Routing.control({
      waypoints: waypoints,
      show: false, /*不顯示路線繪製控制欄*/
    }).addTo(this.map);

    L.Routing.plan([
        L.latLng(this.lastX, this.lastY),
        L.latLng(nowX, nowY)
      ], {
        draggableWaypoints: false,
        addWaypoints: false,
        routeWhileDragging: false,
    }).addTo(this.map);

    this.lastX = nowX;
    this.lastY = nowY;
  }

  //將GPS定位標記在地圖
  gpsMarker() {
    // 使用瀏覽器定位 API 取得目前位置
    navigator.geolocation.getCurrentPosition((position: any) => {
      const { latitude, longitude } = position.coords;

      // 在地圖上添加標記
      const marker = L.marker([latitude, longitude]).addTo(this.map);
    });
  }

  ngOnDestroy() {
    this.client.unsubscribe('apollos/test');
  }
}
