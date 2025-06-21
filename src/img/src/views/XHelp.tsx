import React from 'react'
import { BackgroundImage } from 'jsxp'
// import img_equipment from '@src/assets/img/32.png'
import HTML from './HTML.js'
type PropsType = {
  data: {
    value: {
      title: string
      desc: string
    }[]
    theme?: string
  }
}

function Help({ data }: PropsType) {
  return (
    <HTML>
      <BackgroundImage
        className="px-4"
        id="root"
        data-theme={data?.theme || 'dark'}
        // url={img_equipment}
      >
        <div className="min-h-4"></div>
        <div className="bg-blue-200 bg-opacity-50 border-2 border-cyan-600 px-8 pb-2 rounded-md flex justify-center items-center flex-col gap-4">
          <div className="text-3xl text-white p-2 border-b-2 border-cyan-900 bg-blue-400 bg-opacity-60 shadow-2xl  min-w-96 text-center ">
            修仙帮助
          </div>
          <div className="flex flex-col w-full gap-2 mb-5 overflow-hidden relative  ">
            {
              // 背景渐变
            }
            <div className=" mx-16  shadow-2xl bg-cyan-600 bg-opacity-70 text-white rounded-md text-lg font-bold px-2 text-center">
              使用 /帮助1 查看第一页，使用 /帮助2 查看第二页，以此类推
            </div>
            <div className="text-center">大群（806943302）</div>
            <div className=" flex flex-col gap-4">
              {data.value.map((item, index) => (
                <div
                  key={index}
                  className="px-4 py-2 bg-white bg-opacity-60 rounded-full shadow-md"
                >
                  <div className="flex justify-between">
                    <div className=" font-bold">{item.title}</div>
                    <div className="px-2">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="min-h-4"></div>
      </BackgroundImage>
    </HTML>
  )
}

export default Help
