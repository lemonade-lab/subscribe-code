import { alemonjsCodeVersion, appName } from '@src/models/config.js';
import { BackgroundImage } from 'jsxp';
import React from 'react';
import HTML from './HTML.js';

type PropsType = {
  theme?: string;
  data: {
    title: string;
    list: {
      title: string;
      desc: string;
    }[];
  }[];
};

function Help({ data, theme = 'dark' }: PropsType) {
  return (
    <HTML>
      <BackgroundImage className='px-4' id='root' data-theme={theme} src={''}>
        <div className='min-h-4' />
        <div className='bg-blue-200 bg-opacity-50 border-2 border-pink-400 px-4 pb-2 rounded-md flex justify-center items-center flex-col gap-0.5'>
          <div className='bg-pink-100 bg-opacity-60 text-pink-600 text-2xl px-6 py-2 rounded-2xl border border-pink-400 shadow font-bold text-center mt-4 mb-2'>
            CODE-HELP
          </div>
          <div className='flex flex-col w-full gap-2 mb-3 overflow-visible relative'>
            {data.map((val, index) => (
              <div className='relative rounded-xl mt-6 mb-4 px-0 pt-4 pb-2 bg-white bg-opacity-40 border border-pink-400 shadow-lg' key={index}>
                <div className='absolute -top-3 -left-2 flex items-center'>
                  {/* 左菱形 */}
                  <span className='w-3 h-3 bg-pink-200 border border-pink-400 rotate-45 mr-2 block' />
                  <span className='bg-pink-100 bg-opacity-60 text-pink-600 text-sm px-4 py-1 rounded-2xl border border-pink-400 shadow'>{val.title}</span>
                  {/* 右菱形 */}
                  <span className='w-3 h-3 bg-pink-200 border border-pink-400 rotate-45 ml-2 block' />
                </div>
                <div className='flex flex-wrap pt-2 pb-2 px-6 gap-x-4 gap-y-2'>
                  {val.list.map((item, itemIndex) => (
                    <div
                      className='flex items-center min-w-[250px] max-w-[330px] flex-1 basis-0 bg-white bg-opacity-80 shadow-md rounded-lg px-3 py-2 border border-pink-200'
                      key={itemIndex}
                    >
                      <div className='ml-1 break-all'>
                        <div className='font-bold text-sm text-gray-800'>{item.title}</div>
                        <div className='text-xs text-blue-900 mt-1'>{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className='text-center text-sm text-gray-700 mt-2'>
              Created By -<span className='font-bold text-black-600'> {appName} </span>- v<span className='italic'>{alemonjsCodeVersion}</span>
            </div>
          </div>
        </div>
        <div className='min-h-4' />
      </BackgroundImage>
    </HTML>
  );
}

export default Help;
