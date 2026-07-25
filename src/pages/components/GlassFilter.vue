<template>
  <!--
    液态玻璃折射滤镜：通过 backdrop-filter: url(#lg-lens) 应用到 .glass 面板。
    feTurbulence 生成缓慢流动的噪声场，feDisplacementMap 让玻璃后的内容
    产生真实的光线偏折，代替传统的磨砂模糊。
  -->
  <svg class="lg-filter-defs" width="0" height="0" aria-hidden="true" focusable="false">
    <filter
      id="lg-lens"
      x="-8%"
      y="-8%"
      width="116%"
      height="116%"
      color-interpolation-filters="sRGB"
    >
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.008 0.014"
        numOctaves="2"
        seed="7"
        result="noise"
      >
        <animate
          attributeName="baseFrequency"
          dur="22s"
          values="0.008 0.014;0.012 0.02;0.008 0.014"
          repeatCount="indefinite"
        />
      </feTurbulence>
      <feDisplacementMap
        in="SourceGraphic"
        in2="noise"
        scale="18"
        xChannelSelector="R"
        yChannelSelector="G"
        result="refracted"
      />
      <feGaussianBlur in="refracted" stdDeviation="2.5" result="smoothed" />
      <feColorMatrix in="smoothed" type="saturate" values="1.75" />
    </filter>
  </svg>
</template>

<style scoped>
.lg-filter-defs {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}
</style>
