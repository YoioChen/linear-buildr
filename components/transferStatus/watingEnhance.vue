<!-- pc端多步build、burn -->

<template>
    <div id="transferWatingEnhance">
        <div class="close" @click.stop="$emit('close')">
            <img v-if="isMobile" src="@/static/icon-cancel.svg" />
            <closeSvg v-else></closeSvg>
        </div>

        <div class="waitTitle">
            <span v-if="currentStep > setupArray.length - 1"
                >Congratulations!<br></span
            >
            <span v-else-if="currentErrMsg">Oops! Something went wrong</span>
            <span v-else-if="!currentConfirm">
                <template v-if="walletType == SUPPORTED_WALLETS_MAP.METAMASK">Confirm with Metmask</template>
                <template v-if="walletType == SUPPORTED_WALLETS_MAP.BINANCE_CHAIN">Confirm with BSC Wallet</template>
            </span>
            <span v-else>
                <template v-if="isMobile">
                    Interacting
                </template>
                <template v-else>
                    Interacting with the smart contract
                </template>
            </span>
        </div>

        <div class="waitDesc">
            <span v-if="currentStep > setupArray.length - 1"
                ><!-- 手机端 -->
                <template v-if="isMobile"
                    >Swap transaction has been processed.</template
                >
                <!-- pc端 -->
                <template v-else
                    >Your transaction has been processed already</template
                ></span
            ><span class="error" v-else-if="currentErrMsg">{{
                currentErrMsg
            }}</span>
            <!-- 没完成没错误且是移动端 -->
            <span v-else-if="isMobile">
                Swap transaction is in progress
            </span>
        </div>

        <div class="walletRect">
            <div
                class="walletIcon"
                v-if="walletType == SUPPORTED_WALLETS_MAP.METAMASK"
            >
                <!-- <img
                    v-if="isEthereumNetwork(currentNetworkId)"
                    class="wallteLogo eth"
                    src="@/static/transferProgress/metamask_eth.svg"
                />
                <img
                    v-else-if="isBinanceNetwork(currentNetworkId)"
                    class="wallteLogo eth"
                    src="@/static/transferProgress/metamask_bsc.svg"
                /> -->
                <div class="walletBothIcons">
                    <img
                        class="wallteLogo"
                        src="@/static/transferProgress/wellet_metamask.svg"
                    />
                    <img
                        class="wallteLogo"
                        src="@/static/transferProgress/wellet_bsc.svg"
                    />
                </div>
                <b>BSC Mainnet</b>
                <p>{{abbreviateAddress(walletAddress)}}</p>
            </div>

            <div
                class="walletIcon"
                v-if="walletType == SUPPORTED_WALLETS_MAP.BINANCE_CHAIN"
            >
                <div class="walletBothIcons">
                    <img class="wallteLogo" src="@/static/transferProgress/wellet_bnb.svg" />
                    <img class="wallteLogo" src="@/static/transferProgress/wellet_bsc.svg" />
                </div>
                <b>BSC Chain Wallet</b>
                <p>{{abbreviateAddress(walletAddress)}}</p>
            </div>
        </div>

        <div class="processBar">
            <div class="itemBox">
                <div
                    v-for="(item, index) in setupArray"
                    :key="index"
                    class="item"
                >
                    <div class="imgBox">
                        <transition-group name="img-fade">
                            <!-- 大于进度 -->
                            <img
                                key="1"
                                v-if="currentStep < index"
                                src="@/static/transferProgress/default.svg"
                            />

                            <!-- 当前进度没错误 -->

                            <template
                                v-else-if="
                                    currentStep == index && !currentErrMsg
                                "
                            >
                                <img
                                    key="2"
                                    class="loading"
                                    src="@/static/transferProgress/loading.svg"
                                />

                                <template v-if="!isMobile">
                                    <template
                                        v-if="
                                            isEthereumNetwork(currentNetworkId)
                                        "
                                    >
                                        <img
                                            key="21"
                                            class="walletType"
                                            src="@/static/transferProgress/eth_network.svg"
                                        />
                                    </template>
                                    <template
                                        v-else-if="
                                            isBinanceNetwork(currentNetworkId)
                                        "
                                    >
                                        <img
                                            key="22"
                                            class="walletType"
                                            src="@/static/transferProgress/bsc_network.svg"
                                        />
                                    </template>
                                </template>
                            </template>

                            <!-- 当前进度有错误 -->
                            <img
                                key="3"
                                v-else-if="
                                    currentStep == index && currentErrMsg
                                "
                                src="@/static/transferProgress/failed.svg"
                            />

                            <!-- 已完成进度没错误 -->
                            <img
                                key="4"
                                v-else-if="
                                    currentStep > index && !currentErrMsg
                                "
                                src="@/static/transferProgress/completed.svg"
                            />

                            <!-- 已完成进度有错误 -->
                            <img
                                key="5"
                                v-else-if="currentStep > index && currentErrMsg"
                                src="@/static/transferProgress/completed_disable.svg"
                            />
                        </transition-group>
                    </div>
                    <div
                        class="text"
                        :class="{ current: currentStep == index }"
                    >
                        {{ item }}
                    </div>
                    <div
                        class="view"
                        v-if="
                            currentStep == index &&
                                currentConfirm &&
                                !currentErrMsg &&
                                !isMobile
                        "
                        @click.stop="
                            openBlockchainBrowser(currentHash, currentNetworkId)
                        "
                    >
                        <template v-if="isEthereumNetwork(currentNetworkId)">
                            View Etherscan
                        </template>
                        <template
                            v-else-if="isBinanceNetwork(currentNetworkId)"
                        >
                            View Bscscan
                        </template>

                        <img src="@/static/arrow_right.svg" />
                    </div>
                    <div
                        v-else-if="
                            currentStep == index && currentErrMsg && !isMobile
                        "
                        class="tryAgain"
                        @click.stop="tryAgain"
                    >
                        try again
                    </div>
                </div>
            </div>

            <div class="dividerBox">
                <ul>
                    <li
                        v-for="(item, index) in setupArray"
                        :key="index"
                        class="divider"
                        :class="{
                            has: index < setupArray.length - 1,
                            active: currentStep > index && !currentErrMsg
                        }"
                        :style="{
                            left: `calc(100% / ${setupArray.length} /2)`
                        }"
                    ></li>
                </ul>
            </div>
        </div>

        <!-- 不是等待切链状态且是移动端的时候 -->
        <div v-if="isMobile" class="mobileBtns">
            <!-- 完成 -->
            <div
                class="funcMobileBtn"
                v-if="currentStep > setupArray.length - 1"
                @click.stop="$emit('close')"
            >
                Done
            </div>
            <!-- 错误 -->
            <div
                class="funcMobileBtn"
                v-else-if="currentErrMsg"
                @click.stop="tryAgain"
            >
                try again
            </div>
            <!-- 未确认交易 -->
            <!-- <div class="funcMobileBtn" v-else-if="!currentConfirm">
                Confirm Contract
            </div> -->

            <div
                class="viewMobileBtn"
                v-if="currentConfirm"
                @click.stop="
                    openBlockchainBrowser(currentHash, currentNetworkId)
                "
            >
                <template v-if="isEthereumNetwork(currentNetworkId)">
                    View Etherscan
                </template>
                <template v-else-if="isBinanceNetwork(currentNetworkId)">
                    View Bscscan
                </template>
                <img src="@/static/arrow_right.svg" />
            </div>
        </div>
    </div>
</template>

<script>
import { openBlockchainBrowser } from "@/common/utils";
import closeSvg from "@/components/svg/close";
import {
    SUPPORTED_WALLETS_MAP,
    isEthereumNetwork,
    isBinanceNetwork
} from "@/assets/linearLibrary/linearTools/network";
import {
    abbreviateAddress
} from "@/assets/linearLibrary/linearTools/format";
export default {
    name: "transferWatingEnhance",
    components: {
        closeSvg
    },
    props: {
        currentStep: {
            type: Number,
            default: 1
        },
        currentHash: {
            type: String,
            default: ""
        },
        currentConfirm: {
            type: Boolean,
            default: false
        },
        currentNetworkId: {
            type: [Number, String],
            default: 1
        },
        currentErrMsg: {
            type: String,
            default: ""
        },
        setupArray: {
            type: Array,
            default: function() {
                return [];
            }
        }
    },
    data() {
        return {
            abbreviateAddress,
            openBlockchainBrowser,
            SUPPORTED_WALLETS_MAP,
            isEthereumNetwork,
            isBinanceNetwork
        };
    },
    watch: {
        walletType() {},
        isMobile() {},
        walletAddress() {},
        walletNetworkName() {}
    },
    computed: {
        walletType() {
            return this.$store.state?.walletType;
        },
        isMobile() {
            return this.$store.state?.isMobile;
        },
        walletAddress() {
            return this.$store.state?.wallet?.address;
        },
        walletNetworkName() {
            return this.$store.state?.walletNetworkName;
        },

    },
    mounted() {},
    methods: {
        tryAgain() {
            this.$emit("tryAgain");
        }
    },
    destroyed() {}
};
</script>

<style lang="scss">
#transferWatingEnhance {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    background-color: white;

    .waitTitle {
        font-family: Gilroy-Bold;
        font-size: 32px;
        font-weight: bold;
        font-stretch: normal;
        font-style: normal;
        line-height: 1.25;
        letter-spacing: normal;
        text-align: center;
        color: #5a575c;
        max-width: 550px;
        width: 100%;
        margin-top: 228px;
    }

    .waitDesc {
        width: 100%;
        max-width: 500px;
        max-height: 50px;
        overflow-y: auto;
        color: #5a575c;
        font-family: Gilroy-Regular;
        font-size: 16px;
        font-weight: normal;
        font-stretch: normal;
        font-style: normal;
        line-height: 1.5;
        letter-spacing: normal;
        text-align: center;
        position: absolute;
        top: 272px;
        word-break: break-all;

        .error {
            color: #df434c;
        }
    }

    .walletRect {
        .step {
            cursor: pointer;
            display: flex;
            align-items: center;
            font-family: Gilroy-Bold;
            font-size: 12px;
            font-weight: bold;
            font-stretch: normal;
            font-style: normal;
            line-height: 1.33;
            letter-spacing: 1.5px;
            text-align: center;
            color: #1a38f8;
            text-transform: uppercase;
            margin-top: 8px;

            img {
                margin-left: 4px;
            }
        }
        .walletIcon {
            justify-content: space-evenly;
            align-items: center;
            width: 160px;
            height: 231px;
            margin: 36px 119px 143px 120px;
            border-radius: 8px;
            border: solid 1px #e5e5e5;
            text-align: center;

            .walletBothIcons {
                margin: 67px 0 34px 0;
                .wallteLogo {
                    width: 40px;
                    height: 40px;
                }
            }
            >b {
            }
            >p {
                display: inline-block;
                width: 100px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                font-weight: normal;
                font-stretch: normal;
                font-style: normal;
                line-height: 1.29;
                letter-spacing: normal;
                color: #99999a;
            }

            .arrow {
                width: 148px;
                height: 20px;
                margin: 0 25px;
            }
        }

        .hasBinanceWallet,
        .notBinanceWallet {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }

        .hasBinanceWallet {
            .walletIcon {
                margin-top: 24px;

                .wallteLogo {
                    width: 60px;
                    height: 60px;
                }

                .arrow {
                    width: 70px;
                }
            }

            .divider {
                border-top: 1px solid #e5e5e5;
                margin: 40px 0;
                position: relative;
                width: 150%;

                span {
                    font-family: Gilroy-Regular;
                    font-size: 16px;
                    font-weight: normal;
                    font-stretch: normal;
                    font-style: normal;
                    line-height: 1.5;
                    letter-spacing: normal;
                    text-align: center;
                    color: #99999a;
                    position: absolute;
                    left: 50%;
                    background: white;
                    width: 75px;
                    transform: translate(-50%, -50%);
                }
            }

            .waitTitle {
                margin-top: 0px;
            }
        }

        .notBinanceWallet {
            .walletIcon {
                margin-top: 52px;
            }
        }
    }

    .processBar {
        width: 100%;
        max-width: 500px;
        position: absolute;
        bottom: 165px;

        .itemBox {
            width: 100%;
            position: absolute;
            display: flex;
            justify-content: space-around;
            z-index: 2;

            .item {
                // z-index: 1;
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;

                .imgBox {
                    position: relative;
                    width: 40px;
                    height: 40px;
                    margin-bottom: 8px;

                    img {
                        background-color: white;
                        border-radius: 50%;
                        width: 100%;
                        height: 100%;
                        position: absolute;
                        transform: translateZ(0);

                        &.walletType {
                            width: 16px;
                            height: 16px;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                        }

                        &.loading {
                            animation: rotate 3s linear infinite;
                        }
                    }
                }

                .text {
                    margin-bottom: 4px;
                    font-family: Gilroy-Medium;
                    font-size: 12px;
                    font-weight: 500;
                    font-stretch: normal;
                    font-style: normal;
                    line-height: 1.33;
                    letter-spacing: normal;
                    text-align: center;
                    color: #5a575c;

                    &.current {
                        font-family: Gilroy-Bold;
                        font-weight: bold;
                    }
                }

                .view,
                .tryAgain {
                    cursor: pointer;
                    opacity: 0.2;
                    text-align: center;
                    display: flex;
                    font-family: Gilroy-Bold;
                    font-size: 10px;
                    font-weight: bold;
                    font-stretch: normal;
                    font-style: normal;
                    line-height: 1.6;
                    letter-spacing: 1.25px;
                    color: #1a38f8;
                    text-transform: uppercase;

                    transition: opacity $animete-time linear;

                    img {
                        width: 16px;
                        height: 16px;
                    }

                    &:hover {
                        opacity: 1;
                    }
                }
            }
        }

        .dividerBox {
            position: relative;
            z-index: 1;
            ul {
                list-style: none;
                width: 100%;
                position: relative;
                display: flex;
                justify-content: space-around;
                top: 17.5px;

                li {
                    flex: 1;
                    position: relative;

                    &.has {
                        height: 5px;
                        background-color: #e5e5e5;

                        &.active {
                            background-color: #1a38f8;
                        }
                    }
                }
            }
        }
    }

    .close {
        position: absolute;
        top: 24px;
        right: 24px;
    }
}

@media only screen and (max-width: $max-phone-width) {
    #transferWatingEnhance {
        padding: 24px 32px;
        .waitTitle {
            text-align: left;
            font-size: 16px;
            line-height: 1.5;
            margin-top: 0;
        }

        .waitDesc {
            text-align: left;
            top: 48px;
            left: 32px;
            font-size: 12px;
            line-height: 1.33;
            color: #99999a;
        }

        .walletRect {
            .step {
                font-size: 10px;
                line-height: 1.6;
                letter-spacing: 1.25px;
                position: absolute;
                bottom: 32px;

                img {
                    width: 16px;
                    height: 16px;
                }
            }
            .walletIcon {
                margin-top: 136px;
                .wallteLogo {
                    width: 80px;
                    height: 80px;

                    &.eth {
                        margin-left: 13px;
                    }
                }

                .arrow {
                    width: 24px;
                    height: 24px;
                    margin: 0 16px;
                }
            }

            .notBinanceWallet {
                .walletIcon {
                    margin-top: 136px;
                }
            }
        }

        .processBar {
            position: absolute;
            bottom: 0;
            top: 288px;
            height: 48px;
            width: calc(100% - 20px);

            .itemBox {
                .item {
                    .imgBox {
                        width: 24px;
                        height: 24px;

                        img {
                            &.walletType {
                                width: 9.6px;
                                height: 9.6px;
                            }
                        }
                    }

                    .text {
                        margin-bottom: 4px;
                        font-family: Gilroy;
                        font-size: 10px;
                        line-height: 1.2;
                    }
                }
            }

            .dividerBox {
                ul {
                    top: 10.5px;
                    li {
                        &.has {
                            height: 3px;
                        }
                    }
                }
            }
        }

        .close {
            img {
                width: 26px;
                height: 26px;
            }
        }

        .mobileBtns {
            padding: 0 32px;
            position: absolute;
            bottom: 32px;
            width: 100%;

            .funcMobileBtn {
                width: 100%;
                font-family: Gilroy-Bold;
                font-size: 12px;
                font-weight: bold;
                font-stretch: normal;
                font-style: normal;
                line-height: 1.33;
                letter-spacing: 1.5px;
                text-align: center;
                color: #ffffff;
                padding: 12px 24px;
                border-radius: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: #1a38f8;
                text-transform: uppercase;
            }

            .viewMobileBtn {
                margin-top: 17px;
                font-family: Gilroy-Bold;
                font-size: 10px;
                font-weight: bold;
                font-stretch: normal;
                font-style: normal;
                line-height: 1.6;
                letter-spacing: 1.25px;
                color: #1a38f8;
                display: flex;
                align-items: center;
                justify-content: center;
                text-transform: uppercase;
                img {
                    width: 16px;
                    height: 16px;
                    margin-left: 4px;
                }
            }
        }
    }
}

@keyframes rotate {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(359deg);
    }
}
</style>
