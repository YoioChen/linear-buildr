import {
    getEthereumNetwork,
    getBinanceNetwork,
    SUPPORTED_WALLETS_MAP,
    INFURA_PROJECT_ID,
    onMetamaskAccountChange,
    onBinanceAccountChange,
    onBinanceChainChange,
    onMetamaskChainChange,
    BLOCKCHAIN,
    isEthereumNetwork,
    isBinanceNetwork,
    SUPPORTED_NETWORKS_MAP
} from "./network";
import { LinearJs } from "../linearJs";
import $pub from "pubsub-js";
import { storeDetailsData } from "./request";
const { graphAPIEndpoints } = require("./request/linearData/transactionData");

let lnrJSConnector = {
    signers: LinearJs.signers,
    setContractSettings: function(contractSettings) {
        this.lnrJS = new LinearJs(contractSettings);
        this.signer = this.lnrJS.contractSettings.signer;
        this.provider = this.lnrJS.contractSettings.provider;
        this.utils = this.lnrJS.utils;
    }
};

export const connectToWallet = async networkType => {
    try {
        let network;
        if (networkType == SUPPORTED_WALLETS_MAP.BINANCE_CHAIN) {
            network = await getBinanceNetwork();
        } else if (networkType == SUPPORTED_WALLETS_MAP.METAMASK) {
            network = await getEthereumNetwork();
        }

        const { name, networkId } = network;

        //屏蔽mainnet和ropsten以外的网络
        if (!name || !isEthereumNetwork(networkId)) {
            throw new Error("not support network");
        }

        setSigner({ type: networkType, networkId });

        setGraphApi({ networkId });

        switch (networkType) {
            case SUPPORTED_WALLETS_MAP.METAMASK:
                return connectToMetamask(networkId, name);
            case SUPPORTED_WALLETS_MAP.BINANCE_CHAIN:
                return connectToBinance(networkId, name);
            case SUPPORTED_WALLETS_MAP.WALLET_CONNECT:
                return connectToWalletConnect(networkId, name);
            default:
                return {};
        }
    } catch (error) {
        console.log(error, "connectToWallet error");
        return false;
    }
};

const connectToMetamask = async (networkId, networkName) => {
    const walletState = {
        walletType: SUPPORTED_WALLETS_MAP.METAMASK
    };
    try {
        if (window.ethereum) {
            // window.ethereum.autoRefreshOnNetworkChange = true;
            await window.ethereum.enable();
        }
        const accounts = await lnrJSConnector.signer.getNextAddresses();
        if (accounts && accounts.length > 0) {
            return {
                ...walletState,
                currentWallet: accounts[0],
                networkId,
                networkName: networkName.toLowerCase()
            };
        } else {
            return {
                ...walletState
            };
        }
    } catch (e) {
        console.log(e);
        return {
            ...walletState,
            msg: e
        };
    }
};

const connectToBinance = async (networkId, networkName) => {
    const walletState = {
        walletType: SUPPORTED_WALLETS_MAP.BINANCE_CHAIN
    };
    try {
        if (window.BinanceChain) {
            // window.BinanceChain.autoRefreshOnNetworkChange = true;
            await window.BinanceChain.enable();
        }
        const accounts = await lnrJSConnector.signer.getNextAddresses();
        if (accounts && accounts.length > 0) {
            return {
                ...walletState,
                currentWallet: accounts[0],
                networkId,
                networkName: networkName.toLowerCase()
            };
        } else {
            return {
                ...walletState
            };
        }
    } catch (e) {
        console.log(e);
        return {
            ...walletState,
            msg: e
        };
    }
};

const connectToWalletConnect = async (networkId, networkName) => {
    const walletState = {
        walletType: SUPPORTED_WALLETS_MAP.WALLET_CONNECT
    };
    try {
        await lnrJSConnector.signer.provider._web3Provider.enable();
        const accounts = await lnrJSConnector.signer.getNextAddresses();

        if (accounts && accounts.length > 0) {
            return {
                ...walletState,
                currentWallet: accounts[0],
                networkId,
                networkName: networkName.toLowerCase()
            };
        }
    } catch (e) {
        console.log(e);
        return {
            ...walletState,
            msg: e
        };
    }
};

export const setSigner = ({ type, networkId }) => {
    const signer = new lnrJSConnector.signers[type](
        getSignerConfig({ type, networkId })
    );
    lnrJSConnector.setContractSettings({
        networkId,
        signer
    });
};

/**
 * 根据网络ID重新设置graph地址
 * @param networkId 网络ID
 */
export const setGraphApi = ({ networkId }) => {
    if (isEthereumNetwork(networkId)) {
        if (networkId == SUPPORTED_NETWORKS_MAP.MAINNET) {
            graphAPIEndpoints.ethereum =
                process.env.GRAPH_BUILD_ETHEREUM_MAINNET;
        } else {
            graphAPIEndpoints.ethereum =
                process.env.GRAPH_BUILD_ETHEREUM_ROPSTEN;
        }
    }
};

const getSignerConfig = ({ type, networkId }) => {
    if (type === SUPPORTED_WALLETS_MAP.WALLET_CONNECT) {
        return {
            infuraId: INFURA_PROJECT_ID
        };
    }
    return {};
};

/**
 * 选择钱包
 * @param walletType 钱包类型
 * @param chainChange  是否为切换链状态
 * @param waitStore  是否等待数据获取完成
 * @param regisEvent 是否注册事件
 */
export const selectedWallet = async (
    walletType,
    chainChange = false,
    waitStore = true
) => {
    try {
        //连接钱包
        const walletStatus = await connectToWallet(walletType);
        $nuxt.$Spin.show();
        const store = $nuxt.$store;

        //连接成功
        if (walletStatus && walletStatus?.currentWallet) {
            chainChange && $pub.publish("onWalletStatusChange");

            store.commit(
                "setWalletNetworkName",
                walletStatus?.networkName.toUpperCase()
            );
            store.commit(
                "setWalletNetworkId",
                walletStatus.networkId.toString()
            );

            //防止onWalletAccountChange内数据未更新时,太快进入功能子页获取不到wallet的问题
            store.commit("mergeWallet", {
                address: walletStatus?.currentWallet
            });

            //子图接口api
            let blockChain;
            if (isEthereumNetwork(walletStatus.networkId)) {
                blockChain = BLOCKCHAIN.ETHEREUM;
            } else if (isBinanceNetwork(walletStatus.networkId)) {
                blockChain = BLOCKCHAIN.BINANCE;
            }
            store.commit("setCurrentBlockChain", blockChain);

            store.commit("setWalletType", walletType);

            //不重复注册事件,防止事件叠加
            let registeredMetamaskWalletEvents =
                store.state?.registeredMetamaskWalletEvents;
            let registeredBinanceWalletEvents =
                store.state?.registeredBinanceWalletEvents;

            //绑定事件
            if (
                walletType == SUPPORTED_WALLETS_MAP.METAMASK &&
                !registeredMetamaskWalletEvents
            ) {
                onMetamaskAccountChange(async accounts => {
                    //当前链的钱包切换时才执行更新
                    if (
                        store.state.walletType == SUPPORTED_WALLETS_MAP.METAMASK
                    ) {
                        $nuxt.$Spin.show();
                        $pub.publish("onWalletStatusChange");
                        let { networkId } = await getEthereumNetwork();

                        const address = await lnrJSConnector.signer.getNextAddresses();
                        const signer = new lnrJSConnector.signers[
                            SUPPORTED_WALLETS_MAP.METAMASK
                        ]({});

                        lnrJSConnector.setContractSettings({
                            networkId,
                            signer
                        });

                        store.commit("mergeWallet", {
                            address: address[0]
                        });

                        await storeDetailsData();
                        $nuxt.$Spin.hide();
                    }
                });

                //切换网络刷新页面
                onMetamaskChainChange(async chainId => {
                    if (
                        store.state.walletType == SUPPORTED_WALLETS_MAP.METAMASK
                    ) {
                        if (isEthereumNetwork(Number(chainId))) {
                            selectedWallet(
                                SUPPORTED_WALLETS_MAP.METAMASK,
                                true
                            );
                            $pub.publish("onMetamaskChainChange");
                        } else {
                            //屏蔽mainnet和ropsten以外的网络
                            location.reload();
                        }
                    }
                });

                store.commit("setRegisteredMetamaskWalletEvents", true);
            } else if (
                walletType == SUPPORTED_WALLETS_MAP.BINANCE_CHAIN &&
                !registeredBinanceWalletEvents
            ) {
                onBinanceAccountChange(async accounts => {
                    //当前链的钱包切换时才执行更新
                    if (
                        store.state.walletType ==
                        SUPPORTED_WALLETS_MAP.BINANCE_CHAIN
                    ) {
                        $nuxt.$Spin.show();
                        $pub.publish("onWalletStatusChange");

                        const address = await lnrJSConnector.signer.getNextAddresses();
                        const signer = new lnrJSConnector.signers[
                            SUPPORTED_WALLETS_MAP.BINANCE_CHAIN
                        ]({});

                        lnrJSConnector.setContractSettings({
                            networkId: walletStatus.networkId,
                            signer
                        });

                        store.commit("mergeWallet", {
                            address: address[0]
                        });

                        await storeDetailsData();
                        $nuxt.$Spin.hide();
                    }
                });

                //切换网络刷新页面
                onBinanceChainChange(chainId => {
                    if (
                        store.state.walletType ==
                        SUPPORTED_WALLETS_MAP.BINANCE_CHAIN
                    ) {
                        location.reload();
                    }
                });

                store.commit("setRegisteredBinanceWalletEvents", true);
            } else if (walletType == SUPPORTED_WALLETS_MAP.WALLET_CONNECT) {
            }

            waitStore ? await storeDetailsData() : storeDetailsData();

            return true;
        } else {
            console.log("Connect wallet fail");
        }

        return false;
    } catch (error) {
        console.log(error, "selectedWallet error");
        return false;
    } finally {
        $nuxt.$Spin.hide();
    }
};

export default lnrJSConnector;
