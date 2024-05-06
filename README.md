# yunzai-dynmap-stats

在Yunzai机器人中通过[Dynmap](https://github.com/webbukkit/dynmap)获取Minecraft服务器状态。

## 安装
```sh
git clone --depth=1 https://github.com/Nats-ji/yunzai-dynmap-stats ./plugins/dynmap-stats/
```

## 设置
把 `configs/default_configs/config.yaml` 复制到 `configs/config.yaml`

可配置项目：
```yaml
# Dynmap的网址
url:

# 显示游戏时间
showServerTime: true

# 显示游戏天气
showWeather: true

# 显示玩家生命
showPlayerStats: true
```

## 使用

查看服务器状态：`#MC状态`

> MC服务器当前有2人在线。<br>
> 在线玩家：jeb（20❤️，6🦺）、Notch（20❤️，0🦺）。<br>
> 服务器时间：14:26。<br>
> 服务器天气：晴天。
