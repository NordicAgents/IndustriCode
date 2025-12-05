/*
 * Created by EcoStruxure Automation Expert.
 * User: midxav
 * Date: 2/5/2024
 * Time: 5:18 PM
 * 
 */
using System;
using NxtControl.GuiFramework;
using NxtControl.Services;

#region Definitions;
#region #NodeFinder_HMI;

namespace HMI.Main.Symbols.NodeFinder
{

  public class REQEventArgs : System.EventArgs
  {
    IHMIAccessorService accessorService;
    int channelId;
    int cookie; 
    int eventIndex;

    public REQEventArgs(int channelId, int cookie, int eventIndex)
    {
      this.accessorService = (IHMIAccessorService)ServiceProvider.GetService(typeof(IHMIAccessorService));
      this.channelId = channelId;
      this.cookie = cookie;
      this.eventIndex = eventIndex;
    }
    public bool Get_SkillName(ref System.String value)
    {
      if (accessorService == null)
        return false;
      string var = null;
      bool ret = accessorService.GetStringValue(channelId, cookie, eventIndex, true,0, ref var);
      if (ret) value = (System.String) var;
      return ret;
    }

    public System.String SkillName
    { get {
      if (accessorService == null)
        return null;
      string var = null;
      bool ret = accessorService.GetStringValue(channelId, cookie, eventIndex, true,0, ref var);
      if (!ret) return null;
      return (System.String) var;
    }  }

    public bool Get_FilePath(ref System.String value)
    {
      if (accessorService == null)
        return false;
      string var = null;
      bool ret = accessorService.GetStringValue(channelId, cookie, eventIndex, true,1, ref var);
      if (ret) value = (System.String) var;
      return ret;
    }

    public System.String FilePath
    { get {
      if (accessorService == null)
        return null;
      string var = null;
      bool ret = accessorService.GetStringValue(channelId, cookie, eventIndex, true,1, ref var);
      if (!ret) return null;
      return (System.String) var;
    }  }


  }

}

namespace HMI.Main.Symbols.NodeFinder
{

  public class CNFEventArgs : System.EventArgs
  {
    public CNFEventArgs()
    {
    }
    private System.String NodeIN1_field = null;
    public System.String NodeIN1
    {
       get { return NodeIN1_field; }
       set { NodeIN1_field = value; }
    }
    private System.String NodeSkillCMD_field = null;
    public System.String NodeSkillCMD
    {
       get { return NodeSkillCMD_field; }
       set { NodeSkillCMD_field = value; }
    }
    private System.String NodeOUT1_field = null;
    public System.String NodeOUT1
    {
       get { return NodeOUT1_field; }
       set { NodeOUT1_field = value; }
    }
    private System.String NodeCurrentState_field = null;
    public System.String NodeCurrentState
    {
       get { return NodeCurrentState_field; }
       set { NodeCurrentState_field = value; }
    }

  }

}

namespace HMI.Main.Symbols.NodeFinder
{
  partial class sDefault
  {

    private event EventHandler<HMI.Main.Symbols.NodeFinder.REQEventArgs> REQ_Fired;

    protected override void OnEndInit()
    {
      if (REQ_Fired != null)
        AttachEventInput(0);

    }

    protected override void FireEventCallback(int channelId, int cookie, int eventIndex)
    {
      switch(eventIndex)
      {
        default:
          break;
        case 0:
          if (REQ_Fired != null)
          {
            try
            {
              REQ_Fired(this, new HMI.Main.Symbols.NodeFinder.REQEventArgs(channelId, cookie, eventIndex));
            }
            catch (System.Exception e)
            {
              NxtControl.Services.LoggingService.ErrorFormatted(@"In Event Callback for event:'{0}' Type:'{1}' CAT:'{2}' came exception:{3}
stack Trace:
{4}","REQ_Fired", this.GetType().Name, this.CATName, e.Message, e.StackTrace);
            }
          }
        break; 

      }
    }
    public bool FireEvent_CNF(System.String NodeIN1, System.String NodeSkillCMD, System.String NodeOUT1, System.String NodeCurrentState)
    {
      return ((IHMIAccessorOutput)this).FireEvent(0, new object[] {NodeIN1, NodeSkillCMD, NodeOUT1, NodeCurrentState});
    }
    public bool FireEvent_CNF(HMI.Main.Symbols.NodeFinder.CNFEventArgs ea)
    {
      object[] _values_ = new object[4];
      if (ea.NodeIN1 != null) _values_[0] = ea.NodeIN1;
      if (ea.NodeSkillCMD != null) _values_[1] = ea.NodeSkillCMD;
      if (ea.NodeOUT1 != null) _values_[2] = ea.NodeOUT1;
      if (ea.NodeCurrentState != null) _values_[3] = ea.NodeCurrentState;
      return ((IHMIAccessorOutput)this).FireEvent(0, _values_);
    }
    public bool FireEvent_CNF(System.String NodeIN1, bool ignore_NodeIN1, System.String NodeSkillCMD, bool ignore_NodeSkillCMD, System.String NodeOUT1, bool ignore_NodeOUT1, System.String NodeCurrentState, bool ignore_NodeCurrentState)
    {
      object[] _values_ = new object[4];
      if (!ignore_NodeIN1) _values_[0] = NodeIN1;
      if (!ignore_NodeSkillCMD) _values_[1] = NodeSkillCMD;
      if (!ignore_NodeOUT1) _values_[2] = NodeOUT1;
      if (!ignore_NodeCurrentState) _values_[3] = NodeCurrentState;
      return ((IHMIAccessorOutput)this).FireEvent(0, _values_);
    }

  }
}
#endregion #NodeFinder_HMI;

#endregion Definitions;
