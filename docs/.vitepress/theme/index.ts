import DefaultTheme from 'vitepress/theme'
import type { App } from 'vue'
import './style.css'

import CidrCalculator from './components/CidrCalculator.vue'
import BgpSimulator from './components/BgpSimulator.vue'
import PacketTracer from './components/PacketTracer.vue'
import AwsNetworkSandbox from './components/AwsNetworkSandbox.vue'
import TroubleshootingDrill from './components/TroubleshootingDrill.vue'
import TopologyExplorer from './components/TopologyExplorer.vue'
import DxCommunityCalc from './components/DxCommunityCalc.vue'
import ConntrackCalculator from './components/ConntrackCalculator.vue'
import BadgeLabel from './components/BadgeLabel.vue'
import MermaidRenderer from './components/MermaidRenderer.vue'
import PrintButton from './components/PrintButton.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }: { app: App }) {
    app.component('CidrCalculator', CidrCalculator)
    app.component('BgpSimulator', BgpSimulator)
    app.component('PacketTracer', PacketTracer)
    app.component('AwsNetworkSandbox', AwsNetworkSandbox)
    app.component('TroubleshootingDrill', TroubleshootingDrill)
    app.component('TroubleshootingDrills', TroubleshootingDrill)
    app.component('TopologyExplorer', TopologyExplorer)
    app.component('DxCommunityCalc', DxCommunityCalc)
    app.component('ConntrackCalculator', ConntrackCalculator)
    app.component('BadgeLabel', BadgeLabel)
    app.component('MermaidRenderer', MermaidRenderer)
    app.component('PrintButton', PrintButton)
  }
}
