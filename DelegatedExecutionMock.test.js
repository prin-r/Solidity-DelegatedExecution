const { reverting } = require('openzeppelin-solidity/test/helpers/shouldFail');

const DelegatedExecutionMock = artifacts.require('DelegatedExecutionMock');
const SomeContract = artifacts.require('SomeContract');

require('chai').should();

contract('CommitRevealVoting', ([_, owner, alice, bob, carol]) => {
  beforeEach(async () => {
    this.DelegatedExecutionMock = await DelegatedExecutionMock.new({ from: owner });
    this.SomeContract = await SomeContract.new([this.DelegatedExecutionMock.address], { from: owner });
  });

  context('Basic functions of SomeContract', () => {
    it('setNumberToString', async () => {
      // not lie
      await this.SomeContract.setNumberToString(alice, 13, 'I am alice', { from: alice });
      (await this.SomeContract.numberToString(13)).should.eq('I am alice');
      // lie
      await reverting(this.SomeContract.setNumberToString(alice, 13, 'I am alice', { from: bob }));
    });
    it('setMyNumber', async () => {
      // not lie
      await this.SomeContract.setMyNumber(alice, 99, { from: alice });
      (await this.SomeContract.myNumber(alice)).toString().should.eq('99');
      // lie
      await reverting(this.SomeContract.setMyNumber(alice, 88, { from: bob }));
    });
    it('doSomethingAndCall', async () => {
      // not lie
      const data = await this.SomeContract.contract.methods.setMyNumber(alice, 234).encodeABI();
      await this.SomeContract.doSomethingAndCall(
        alice,
        this.SomeContract.address,
        111,
        '0x' + data.slice(2, 10),
        '0x' + data.slice(10 + 64),
        { from: alice }
      );
      (await this.SomeContract.count()).toString().should.eq('111');
      (await this.SomeContract.myNumber(alice)).toString().should.eq('234');
      // lie
      const data2 = await this.SomeContract.contract.methods.setMyNumber(alice, 21).encodeABI();
      await reverting(this.SomeContract.doSomethingAndCall(
        alice,
        this.SomeContract.address,
        111,
        '0x' + data2.slice(2, 10),
        '0x' + data2.slice(0 + 64),
        { from: bob }
      ));
      // not equal
    });
  });

  context('Basic functions of DelegatedExecutionMock', () => {
    it('verify', async () => {
      const nonce = 0;
      const data = await this.SomeContract.contract.methods.setMyNumber(alice, 3).encodeABI();
      const hash = web3.utils.soliditySha3(nonce, data);
      const sig = await web3.eth.sign(hash, alice);
      (await this.DelegatedExecutionMock.verify(
        alice,
        nonce,
        data,
        sig
      )).toString().should.eq('true');
    });
    it('performDelegateExec', async () => {
      const nonce = 0;
      const data = await this.SomeContract.contract.methods.setMyNumber(alice, 55).encodeABI();
      const dataNoFuncSig = '0x' + data.slice(10 + 64);
      const hash = web3.utils.soliditySha3(nonce, dataNoFuncSig);
      const sig = await web3.eth.sign(hash, alice);
      await this.DelegatedExecutionMock.performDelegateExec(
        alice,
        this.SomeContract.address,
        '0x' + data.slice(2, 10),
        dataNoFuncSig,
        nonce,
        sig
      );
      (await this.SomeContract.myNumber(alice)).toString().should.eq('55');
    });
    it('should fail, performDelegateExec with prev nonce', async () => {
      const nonce = 0;
      let data = await this.SomeContract.contract.methods.setMyNumber(alice, 55).encodeABI();
      let dataNoFuncSig = '0x' + data.slice(10 + 64);
      let hash = web3.utils.soliditySha3(nonce, dataNoFuncSig);
      let sig = await web3.eth.sign(hash, alice);
      await this.DelegatedExecutionMock.performDelegateExec(
        alice,
        this.SomeContract.address,
        '0x' + data.slice(2, 10),
        dataNoFuncSig,
        nonce,
        sig
      );
      (await this.SomeContract.myNumber(alice)).toString().should.eq('55');

      data = await this.SomeContract.contract.methods.setMyNumber(alice, 66).encodeABI();
      dataNoFuncSig = '0x' + data.slice(10 + 64);
      hash = web3.utils.soliditySha3(nonce, dataNoFuncSig);
      sig = await web3.eth.sign(hash, alice);
      // should be correct
      (await this.DelegatedExecutionMock.verify(
        alice,
        nonce,
        dataNoFuncSig,
        sig
      )).toString().should.eq('true');
      // should revert because use prev nonce
      await reverting(this.DelegatedExecutionMock.performDelegateExec(
        alice,
        this.SomeContract.address,
        '0x' + data.slice(2, 10),
        dataNoFuncSig,
        nonce,
        sig
      ));
    });
    it('performDelegateExec with chain calling', async () => {
      const call1Data = await this.SomeContract.contract.methods.setMyNumber(alice, 234).encodeABI();
      const call2Data = await this.SomeContract.contract.methods.doSomethingAndCall(
        alice,
        this.SomeContract.address,
        111,
        '0x' + call1Data.slice(2, 10),
        '0x' + call1Data.slice(10 + 64)
      ).encodeABI();

      const nonce = 0;
      const dataNoFuncSig = '0x' + call2Data.slice(10 + 64);
      const hash = web3.utils.soliditySha3(nonce, dataNoFuncSig);
      const sig = await web3.eth.sign(hash, alice);
      await this.DelegatedExecutionMock.performDelegateExec(
        alice,
        this.SomeContract.address,
        '0x' + call2Data.slice(2, 10),
        dataNoFuncSig,
        nonce,
        sig
      );
      (await this.SomeContract.count()).toString().should.eq('111');
      (await this.SomeContract.myNumber(alice)).toString().should.eq('234');
    });
  });
});
