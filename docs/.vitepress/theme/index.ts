import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
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
import ReadingProgressBar from './components/ReadingProgressBar.vue'
import NetworkTerm from './components/NetworkTerm.vue'
import GlossaryExplorer from './components/GlossaryExplorer.vue'
import GlobalAcceleratorSim from './components/GlobalAcceleratorSim.vue'
import ConceptCheckpoint from './components/ConceptCheckpoint.vue'
import DidacticBridge from './components/DidacticBridge.vue'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      'layout-top': () => h(ReadingProgressBar)
    })
  },
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
    app.component('ReadingProgressBar', ReadingProgressBar)
    app.component('NetworkTerm', NetworkTerm)
    app.component('NetworkAbbr', NetworkTerm)
    app.component('Term', NetworkTerm)
    app.component('Abbr', NetworkTerm)
    app.component('GlossaryExplorer', GlossaryExplorer)
    app.component('GlobalAcceleratorSim', GlobalAcceleratorSim)
    app.component('ConceptCheckpoint', ConceptCheckpoint)
    app.component('DidacticBridge', DidacticBridge)
  }
}
