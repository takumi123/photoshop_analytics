'use client'

import { useState } from 'react'
import Psd from '@webtoon/psd'
import Image from 'next/image'

interface PsdFileInfo {
  width: number;
  height: number;
  colorMode: string;
  layers: Array<{
    name: string;
    width?: number;
    height?: number;
    opacity?: number;
    visible?: boolean;
    type: 'Layer' | 'Group';
    open?: boolean;
    top?: number;
    left?: number;
    blendMode?: string;
    clipped?: boolean;
    text?: string; // テキストレイヤーの内容
    guides?: Array<{
      position: number;
      orientation: 'horizontal' | 'vertical';
    }>;
    slices?: Array<{
      name: string;
      bounds: {
        top: number;
        left: number;
        bottom: number;
        right: number;
      };
    }>;
  }>;
}

interface PsdLayerNode {
  type: 'Layer' | 'Group';
  name: string;
  width?: number;
  height?: number;
  opacity?: number;
  visible?: boolean;
  open?: boolean;
  children?: PsdLayerNode[];
  top?: number;
  left?: number;
  blendMode?: string;
  clipped?: boolean;
  text?: string;
  guides?: Array<{
    position: number;
    orientation: 'horizontal' | 'vertical';
  }>;
  slices?: Array<{
    name: string;
    bounds: {
      top: number;
      left: number;
      bottom: number;
      right: number;
    };
  }>;
}

export default function PsdAnalyzer() {
  const [psdInfo, setPsdInfo] = useState<PsdFileInfo | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')

  const analyzePsd = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const arrayBuffer = await file.arrayBuffer()
      const psdFile = Psd.parse(arrayBuffer)

      // キャンバスに合成イメージを描画
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = psdFile.width
      canvas.height = psdFile.height
      
      const compositeBuffer = await psdFile.composite()
      const imageData = new ImageData(
        compositeBuffer,
        psdFile.width,
        psdFile.height
      )
      ctx?.putImageData(imageData, 0, 0)
      setImagePreview(canvas.toDataURL())

      // PSDファイルの情報を収集
      const info = {
        width: psdFile.width,
        height: psdFile.height,
        colorMode: psdFile.colorMode.toString(),
        layers: [] as PsdFileInfo['layers']
      }

      // レイヤー情報を再帰的に収集
      const collectLayerInfo = (node: PsdLayerNode) => {
        if (node.type === 'Layer') {
          info.layers.push({
            name: node.name,
            width: node.width,
            height: node.height,
            opacity: node.opacity,
            visible: node.visible,
            type: node.type,
            top: node.top,
            left: node.left,
            blendMode: node.blendMode,
            clipped: node.clipped,
            text: (node as PsdLayerNode).text, // テキストレイヤーの内容
            guides: (node as PsdLayerNode).guides, // ガイド情報
            slices: (node as PsdLayerNode).slices // スライス情報
          })
        } else if (node.type === 'Group') {
          info.layers.push({
            name: node.name,
            type: node.type,
            open: node.open,
            guides: (node as PsdLayerNode).guides,
            slices: (node as PsdLayerNode).slices
          })
          node.children?.forEach((child: PsdLayerNode) => collectLayerInfo(child))
        }
      }

      psdFile.children.forEach(collectLayerInfo)
      setPsdInfo(info)

    } catch (error) {
      console.error('PSDファイルの解析中にエラーが発生しました:', error)
      alert('PSDファイルの解析に失敗しました')
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4 text-black">PSDファイル解析ツール</h1>
      
      <input
        type="file"
        accept=".psd,.psb"
        onChange={analyzePsd}
        className="mb-4 block text-black"
      />

      {imagePreview && (
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2 text-black">プレビュー</h2>
          <Image
            src={imagePreview}
            alt="PSD preview"
            width={psdInfo?.width || 0}
            height={psdInfo?.height || 0}
            className="max-w-full h-auto"
            unoptimized
          />
        </div>
      )}

      {psdInfo && (
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2 text-black">ファイル情報</h2>
          <div className="bg-gray-100 p-4 rounded">
            <p className="text-black">幅: {psdInfo.width}px</p>
            <p className="text-black">高さ: {psdInfo.height}px</p>
            <p className="text-black">カラーモード: {psdInfo.colorMode}</p>
            
            <h3 className="text-lg font-bold mt-4 mb-2 text-black">レイヤー構造</h3>
            <div className="pl-4">
              {psdInfo.layers.map((layer: PsdFileInfo['layers'][number], index: number) => (
                <div key={index} className="mb-2">
                  <p className="text-black">
                    {layer.type === 'Group' ? '📁' : '🖼️'} {layer.name}
                    {layer.type === 'Layer' && (
                      <span className="text-sm text-gray-600">
                        {' '}
                        ({layer.width}x{layer.height}, 
                        位置: X:{layer.left}px Y:{layer.top}px, 
                        不透明度: {layer.opacity}%, 
                        表示: {layer.visible ? '表示' : '非表示'}, 
                        ブレンドモード: {layer.blendMode}, 
                        クリッピング: {layer.clipped ? 'あり' : 'なし'}
                        {layer.text && `, テキスト: ${layer.text}`}
                        {layer.guides && layer.guides.length > 0 && `, ガイド数: ${layer.guides.length}`}
                        {layer.slices && layer.slices.length > 0 && `, スライス数: ${layer.slices.length}`})
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
