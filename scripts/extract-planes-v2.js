我正在参加 TRAE AI 创造力大赛！

赛道：创意开发赛道

## 1. 创意名称 + 创意介绍

创意名称：
太空逃亡 — AI 驱动的自适应星际生存挑战

想解决什么问题：
大多数网页躲避游戏难度固定——高手觉得无聊，新手上来就劝退。本项目引入 AI 动态难度调节，实时分析玩家的反应速度、失误频率和连续躲避能力，自动匹配最合适的挑战强度。同时，传统小游戏缺乏叙事驱动，玩家容易流失——通过章节式剧情挑战，让每次游戏都有推进故事的目标感。此外，网页游戏普遍没有成长体系，玩几次就腻了——通过 13+ 种成就解锁皮肤和在线排行榜，让玩家始终有新的目标。

为什么会想到做这个：
小时候玩雷电、是男人就下一百层这类街机游戏时，总希望难度能「读懂」自己的水平，而不是一刀切。结合对 Canvas 2D 绘图和游戏引擎的兴趣，决定从零手写一个带 AI 难度调节 + 剧情驱动的躲避游戏，从陨石的不规则形状渲染到引擎尾焰的呼吸动画都亲力亲为，不依赖任何现成游戏框架。

大概是什么产品：
一个可直接在浏览器中运行的网页小游戏（PC + 手机均可），无需下载安装。

## 2. 目标用户及痛点

面向哪些用户：
· 喜欢街机躲避类小游戏的休闲玩家
· 工作间隙需要快速放松的上班族和学生
· 想要挑战高分、冲击排行榜的竞技型玩家

在什么场景下使用：
碎片化时间场景——通勤路上、午休间隙、排队等候时，打开浏览器就能玩一局（单局通常 1-3 分钟）。
· PC 端：方向键操控，手感精准
· 手机端：支持重力感应倾斜操控，无需虚拟按键，自然跟手

当前痛点：
❌ 固定难度 → ✅ AI 实时分析玩家表现，动态调节难度
❌ 缺乏剧情和目标感 → ✅ 章节式剧情挑战，每章有明确任务目标
❌ 触屏虚拟方向键精度差 → ✅ 移动端重力感应倾斜操控
❌ 登录流程太重 → ✅ 昵称 + 设备指纹即可排行榜，无需注册
❌ 没有成长体系 → ✅ 13+ 种成就解锁皮肤 + 在线排行榜

## 3. 价值与意义

用户体验价值：
· AI 动态难度调节：实时分析玩家表现，让每个人都在「略有挑战但不会绝望」的区间内游玩
· 章节式剧情挑战：每章设定不同任务目标，让重复游玩有推进感
· 丰富的成就皮肤体系：13+ 种飞船皮肤，兼顾轻度玩家和硬核玩家
· 零摩擦上手：打开即玩，无需注册登录

技术展示价值：
· AI 难度调节算法、像素级碰撞检测、Canvas 游戏引擎全部自研，不依赖游戏框架
· 移动端重力感应交互适配，展示跨端游戏开发能力
· Next.js 14 + TypeScript + Supabase 全栈架构const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputPath = path.join(__dirname, '..', 'public', 'skins', 'planes.png');
const outputDir = path.join(__dirname, '..', 'public', 'skins', 'planes');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const planeNames = [
  '紫晶幻影',
  '沙漠风暴',
  '翠绿突袭者',
  '橙色彗星',
  '青锋战机',
  '深绿守护者',
  '金色猎鹰',
  '紫翼巡航者',
  '洋红烈焰',
  '冰蓝战机',
  '暗夜魅影',
  '青铜泰坦'
];

(async () => {
  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    const { width, height } = metadata;
    
    console.log(`原始图片尺寸: ${width} × ${height}`);
    
    const cols = 4;
    const rows = 3;
    const cellWidth = Math.floor(width / cols);
    const cellHeight = Math.floor(height / rows);
    
    console.log(`网格: ${cols}列 × ${rows}行，每格 ${cellWidth} × ${cellHeight}`);
    
    let index = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const left = col * cellWidth;
        const top = row * cellHeight;
        
        const marginX = Math.floor(cellWidth * 0.08);
        const marginY = Math.floor(cellHeight * 0.08);
        
        const cropWidth = cellWidth - marginX * 2;
        const cropHeight = cellHeight - marginY * 2;
        
        const fileName = `ship-${index + 1}.png`;
        const outputPath = path.join(outputDir, fileName);
        
        await image
          .clone()
          .extract({
            left: left + marginX,
            top: top + marginY,
            width: cropWidth,
            height: cropHeight
          })
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true })
          .then(({ data, info }) => {
            const { width: w, height: h, channels } = info;
            const pixelCount = w * h;
            
            for (let i = 0; i < pixelCount; i++) {
              const idx = i * channels;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              
              const isWhite = r > 240 && g > 240 && b > 240;
              const isLight = r > 220 && g > 220 && b > 220;
              
              if (isWhite) {
                data[idx + 3] = 0;
              } else if (isLight) {
                const fade = Math.max(0, (r - 220) / 20);
                data[idx + 3] = Math.floor(data[idx + 3] * (1 - fade));
              }
            }
            
            return sharp(data, {
              raw: { width: w, height: h, channels }
            }).png().toFile(outputPath);
          });
        
        console.log(`✓ ${planeNames[index]} → ${fileName} (${cropWidth}×${cropHeight})`);
        index++;
      }
    }
    
    console.log(`\n✅ 12个飞机模型提取完成，已去除白色背景`);
    console.log(`输出目录: ${outputDir}`);
    
  } catch (err) {
    console.error('❌ 处理失败:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
