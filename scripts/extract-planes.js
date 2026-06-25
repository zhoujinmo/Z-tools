const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputPath = path.join(__dirname, '..', 'public', 'skins', decodeURIComponent('屏幕截图 2026-06-25 175015.png'));
const outputDir = path.join(__dirname, '..', 'public', 'skins', 'planes');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const planeNames = [
  '紫晶幻影', '沙漠风暴', '翠绿突袭者', '橙色彗星',
  '青锋战机', '深绿守护者', '金色猎鹰', '紫翼巡航者',
  '洋红烈焰', '冰蓝战机', '暗夜魅影', '青铜泰坦'
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
    
    console.log(`网格尺寸: ${cols}列 × ${rows}行 = ${cols * rows}个`);
    console.log(`每个单元格: ${cellWidth} × ${cellHeight}`);
    
    let index = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const left = col * cellWidth;
        const top = row * cellHeight;
        
        const marginX = Math.floor(cellWidth * 0.05);
        const marginY = Math.floor(cellHeight * 0.05);
        
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
          .flatten({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .threshold(20)
          .toFormat('png')
          .toFile(outputPath);
        
        console.log(`✓ ${planeNames[index]} -> ${fileName}`);
        index++;
      }
    }
    
    console.log('\n✅ 全部12个飞机模型提取完成！');
    console.log(`输出目录: ${outputDir}`);
    
  } catch (err) {
    console.error('❌ 处理失败:', err);
    process.exit(1);
  }
})();
