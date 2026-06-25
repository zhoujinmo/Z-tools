const sharp = require('sharp');
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
